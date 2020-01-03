let sectionsSnapshot;
let showAll = false;

function getSections() {
  // Get all sections from page
  const sectionsRaw = document.querySelectorAll(
    'body > div > div > div > div > div._main > div.Contents >div.Section'
  );

  const sections = [];

  sectionsRaw.forEach(section => {
    const sectionName = section.querySelector('h2').innerText;

    const episodesRaw = section.querySelectorAll('div.Episode');
    const episodes = [];

    episodesRaw.forEach(episode => {
      const episodeName = episode.querySelector('div._content > div._title')
        .innerHTML;
      const episodeDuration = episode.querySelector(
        'div._content > div._duration'
      ).innerHTML;

      episodes.push({
        duration: episodeDuration,
        finished: false,
        name: episodeName
      });
    });

    sections.push({
      EPISODES: episodes,
      NAME: sectionName
    });
  });

  return sections;
}

function checkSnapshot() {
  const newSections = getSections();
  const oldSections = sectionsSnapshot;

  const newSnapshot = [];

  // Old snapshot with all episodes "finished" property set to false
  const oldSectionsClean = oldSections.map(s => {
    const sectionClean = Object.assign({}, s);
    sectionClean.EPISODES = sectionClean.EPISODES.map(e => {
      const episodeClean = Object.assign({}, e);
      episodeClean.finished = false;
      return episodeClean;
    });
    return sectionClean;
  });

  const oldJSON = JSON.stringify(oldSectionsClean);
  const newJSON = JSON.stringify(newSections);

  console.log('newSections', newSections);

  if (newSections.length === 0 || oldJSON === newJSON) {
    return;
  }

  newSections.forEach(newSection => {
    // Add "finished" property to episodes from old snapshot
    const newSectionProcessed = {};

    newSectionProcessed.EPISODES = [];
    newSectionProcessed.NAME = newSection.NAME;

    newSection.EPISODES.forEach(newEpisode => {
      let finished = false;

      const oldSection = oldSections.find(
        s => s.NAME === newSection.NAME && s.NUMBER === newSection.NUMBER
      );

      if (oldSection) {
        const oldEpisode = oldSection.EPISODES.find(
          e => e.name === newEpisode.name
        );
        if (oldEpisode && oldEpisode.finished) {
          finished = true;
        }
      }

      newSectionProcessed.EPISODES.push({
        duration: newEpisode.duration,
        finished,
        name: newEpisode.name
      });
    });

    newSnapshot.push(newSectionProcessed);
  });

  return {
    oldSections,
    newSnapshot
  };
}

function getFinished() {
  return sectionsSnapshot.map(s => {
    const newS = Object.assign({}, s);
    newS.EPISODES = newS.EPISODES.filter(e => e.finished);
    return newS;
  });
}

function getUnfinished() {
  return sectionsSnapshot.map(s => {
    const newS = Object.assign({}, s);
    newS.EPISODES = newS.EPISODES.filter(e => !e.finished);
    return newS;
  });
}

function validateSnapshot() {
  const result = checkSnapshot();
  if (!result) return;
  const { oldSections, newSnapshot } = result;
  console.log('PLEASE UPDATE SNAPSHOT', oldSections, newSnapshot);
}

function writeToFirestore(database) {
  database
    .collection('personal')
    .doc('howacarworks2')
    .set({
      sectionsSnapshot
    })
    .then(function() {
      console.log('Document successfully written!');
    })
    .catch(function(error) {
      console.error('Error writing document: ', error);
    });
}

function updateSnapshot(database) {
  const result = checkSnapshot();
  if (!result) return;
  const { newSnapshot } = result;
  sectionsSnapshot = newSnapshot;
  writeToFirestore(database);
}

function formatSections(sections, asObject = false) {
  const formattedSections = asObject ? {} : [];
  sections.forEach(s => {
    const sectionName = s.NAME;
    const episodes = s.EPISODES;
    if (episodes.length > 0) {
      if (asObject) {
        formattedSections[sectionName] = [];
      } else {
        formattedSections.push(sectionName);
      }
    }
    episodes.forEach(e => {
      if (asObject) {
        formattedSections[sectionName].push(e.name);
      } else {
        formattedSections.push(`\t${e.name}`);
      }
    });
  });

  return formattedSections;
}

function processEpisodeFromSnapshot(episodeFromSnapshot, episodeName, episode) {
  if (episodeFromSnapshot && episodeFromSnapshot.finished) {
    if (!showAll) {
      episode.classList.add('hideElement');
    }
    episodeName.classList.add('finished');
  } else {
    episode.classList.remove('hideElement');
    episodeName.classList.remove('finished');
  }
}

function markFinished() {
  // Get all sections from page
  const sectionsRaw = document.querySelectorAll(
    'body > div > div > div > div > div._main > div.Contents >div.Section'
  );

  if (sectionsRaw.length > 0) {
    sectionsRaw.forEach(section => {
      const sectionName = section.querySelector('h2').innerText;

      const sectionFromSnapshot = sectionsSnapshot.find(
        s => s.NAME === sectionName
      );

      const episodesRaw = section.querySelectorAll('div.Episode');

      if (sectionFromSnapshot) {
        episodesRaw.forEach(episode => {
          const episodeName = episode.querySelector(
            'div._content > div._title'
          );

          const episodeFromSnapshot = sectionFromSnapshot.EPISODES.find(
            e => e.name === episodeName.innerHTML
          );

          processEpisodeFromSnapshot(episodeFromSnapshot, episodeName, episode);
        });
      }
    });
  } else {
    const filteredEpisodes = document.querySelectorAll(
      'body > div > div > div > div > div._main > div.Contents > div > div.Episode'
    );

    filteredEpisodes.forEach(episode => {
      const episodeName = episode.querySelector('div._content > div._title');

      // .map(x => x.s).reduce((acc,val) => acc.concat(val), [])
      const episodeFromSnapshot = sectionsSnapshot
        .map(s => s.EPISODES)
        .reduce((acc, val) => acc.concat(val), [])
        .find(e => e.name === episodeName.innerHTML);

      processEpisodeFromSnapshot(episodeFromSnapshot, episodeName, episode);
    });
  }
}

const firebaseConfig = {
  apiKey: 'AIzaSyDyE4p0mCYfd8lwJiUolw0GR2BBwhDIbZs',
  authDomain: 'portfolio-d99ae.firebaseapp.com',
  databaseURL: 'https://portfolio-d99ae.firebaseio.com',
  projectId: 'portfolio-d99ae',
  storageBucket: 'portfolio-d99ae.appspot.com',
  messagingSenderId: '961224126421',
  appId: '1:961224126421:web:82e45e80df94d706cc575c'
};

firebase.initializeApp(firebaseConfig);

const database = firebase.firestore();

const waitForSections = setInterval(() => {
  const checkSections = getSections();
  console.log('checkSections', checkSections);

  if (checkSections.length > 0) {
    clearInterval(waitForSections);
    database
      .collection('personal')
      .doc('howacarworks2')
      .onSnapshot(firestoreDoc => {
        sectionsSnapshot = firestoreDoc.data().sectionsSnapshot;

        console.log('sectionsSnapshot', sectionsSnapshot);
        validateSnapshot();

        document
          .querySelector(
            'body > div > div > div > div > div._main > div.Contents > div.bp3-input-group.SearchBox > input'
          )
          .addEventListener('input', () => setTimeout(markFinished, 10));

        markFinished();

        updateSnapshot(database);
      });
  }
}, 500);

// https://codepen.io/personable/pen/stpwD
