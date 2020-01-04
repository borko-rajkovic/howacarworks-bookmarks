// Toggle switch
// https://codepen.io/personable/pen/stpwD

// Checkbox
// https://codepen.io/andreasstorm/pen/aXYzqg

let sectionsSnapshot;
let showAll = true;
let clearButtonEventListenerSet = false;
let database = null;
let toggle = null;
let episodesTotalTime = 0;
let episodesCount = 0;
let userId;
let userEmail;

const toggleDiv = `<div class="can-toggle demo-rebrand-1 top-offset">
<input id="showAll" type="checkbox" />
<label id="toggleLabel" for="showAll">
  <div
    class="can-toggle__switch"
    data-checked="Filter"
    data-unchecked="Off"
  ></div>
</label>
</div>`;

const checkboxChecked = `<div class="customCheckBox">
<input type="checkbox" class="notDisplayed" checked="checked" />
<label class="cbx cbx-checked">
  <div class="flip cbx-flip-checked">
    <div class="front"></div>

    <div class="back">
      <svg width="16" height="14" viewBox="0 0 16 14">
        <path d="M2 8.5L6 12.5L14 1.5"></path>
      </svg>
    </div>
  </div>
</label>
</div>`;

const checkboxUnchecked = `<div class="customCheckBox">
<input type="checkbox" class="notDisplayed" />
<label class="cbx">
  <div class="flip">
    <div class="front"></div>

    <div class="back">
      <svg width="16" height="14" viewBox="0 0 16 14">
        <path d="M2 8.5L6 12.5L14 1.5"></path>
      </svg>
    </div>
  </div>
</label>
</div>`;

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstChild;
}

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

function writeToFirestore() {
  database
    .collection('bookmarks')
    .doc(userId)
    .set({
      sectionsSnapshot,
      email: userEmail
    })
    .then(function() {
      console.log('Document successfully written!');
    })
    .catch(function(error) {
      console.error('Error writing document: ', error);
    });
}

function updateSnapshot() {
  const result = checkSnapshot();
  if (!result) return;
  const { newSnapshot } = result;
  sectionsSnapshot = newSnapshot;
  writeToFirestore();
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
  const checked = episodeFromSnapshot && episodeFromSnapshot.finished;
  if (checked) {
    if (!showAll) {
      episode.classList.add('hideElement');
    } else {
      episode.classList.remove('hideElement');
    }
    episodeName.classList.add('finished');
  } else {
    episode.classList.remove('hideElement');
    episodeName.classList.remove('finished');
  }

  if (!checked || showAll) {
    episodesCount++;

    const duration = episodeFromSnapshot.duration;
    const durationStrings = duration.split(':');
    const durationSeconds =
      Number(durationStrings[0]) * 60 + Number(durationStrings[1]);

    episodesTotalTime += durationSeconds;
  }

  const checkbox = createElementFromHTML(
    checked ? checkboxChecked : checkboxUnchecked
  );

  if (!episode.querySelector('div.customCheckBox')) {
    episode
      .querySelector('div._content')
      .insertAdjacentElement('afterend', checkbox);

    episode
      .querySelector('div.customCheckBox > label')
      .addEventListener('click', event => {
        event.stopPropagation();
        checkbox.parentElement.querySelector('input').click();
      });

    const input = episode.querySelector('div.customCheckBox > input');
    input.addEventListener('click', event => {
      event.stopPropagation();
    });
    input.addEventListener('change', event => {
      event.stopPropagation();
      if (input.checked) {
        input.parentElement.querySelector('label').classList.add('cbx-checked');
        input.parentElement
          .querySelector('label > div')
          .classList.add('cbx-flip-checked');
      } else {
        input.parentElement
          .querySelector('label')
          .classList.remove('cbx-checked');
        input.parentElement
          .querySelector('label > div')
          .classList.remove('cbx-flip-checked');
      }
      const episodeForUpdate = sectionsSnapshot
        .map(s => s.EPISODES)
        .reduce((acc, val) => acc.concat(val), [])
        .find(e => e.name === episodeName.innerHTML);

      episodeForUpdate.finished = input.checked;
      setTimeout(() => {
        writeToFirestore();
      }, 300);
    });
  }
}

function markFinishedAndAttachCheckbox() {
  // Get all sections from page
  const sectionsRaw = document.querySelectorAll(
    'body > div > div > div > div > div._main > div.Contents >div.Section'
  );

  episodesTotalTime = 0;
  episodesCount = 0;

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

  // document.querySelector("body > div > div > div > div > div._main > div.Contents > div._summary").innerText = '123 episodes / 14h16m';

  const totalMinutes = Math.round(episodesTotalTime / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const leftMinutes = totalMinutes - totalHours * 60;

  document.querySelector(
    'body > div > div > div > div > div._main > div.Contents > div._summary'
  ).innerText = `${episodesCount} episodes / ${totalHours}h${leftMinutes}m`;
}

const firebaseConfig = {
  apiKey: 'AIzaSyAFq8Y_fF5wSlm221wpD76rMHml-cQgRmY',
  authDomain: 'howacarworks-bookmarks.firebaseapp.com',
  databaseURL: 'https://howacarworks-bookmarks.firebaseio.com',
  projectId: 'howacarworks-bookmarks',
  storageBucket: 'howacarworks-bookmarks.appspot.com',
  messagingSenderId: '1053356756342',
  appId: '1:1053356756342:web:62b1db235749c2e49e3e57'
};

firebase.initializeApp(firebaseConfig);

database = firebase.firestore();

const waitForSections = setInterval(() => {
  const checkSections = getSections();

  if (checkSections.length > 0) {
    clearInterval(waitForSections);

    main();
  }
}, 50);

async function main() {
  const reactDataPropsRaw = document
    .querySelector('body > div > div > div')
    .getAttribute('data-react-props');

  const reactDataProps = JSON.parse(reactDataPropsRaw);

  if (!reactDataProps.user) {
    return;
  }

  userId = reactDataProps.user.id.toString();
  userEmail = reactDataProps.user.email;

  const docSnapshot = await database
    .collection('bookmarks')
    .doc(userId)
    .get();

  if (!docSnapshot.exists) {
    database
      .collection('bookmarks')
      .doc(userId)
      .set({ sectionsSnapshot: [], email: userEmail });
  }

  database
    .collection('bookmarks')
    .doc(userId)
    .onSnapshot(firestoreDoc => {
      sectionsSnapshot = firestoreDoc.data().sectionsSnapshot;

      updateSnapshot();

      document
        .querySelector(
          'body > div > div > div > div > div._main > div.Contents > div.bp3-input-group.SearchBox > input'
        )
        .addEventListener('input', () =>
          setTimeout(() => {
            const clearButton = document.querySelector(
              'body > div > div > div > div > div._main > div.Contents > div.bp3-input-group.SearchBox > span.bp3-input-action > button'
            );
            if (clearButton && !clearButtonEventListenerSet) {
              clearButtonEventListenerSet = true;
              clearButton.addEventListener('click', () => {
                setTimeout(() => {
                  markFinishedAndAttachCheckbox();
                }, 10);
              });
            } else if (!clearButton && clearButtonEventListenerSet) {
              clearButtonEventListenerSet = false;
            }
            markFinishedAndAttachCheckbox();
          }, 10)
        );

      markFinishedAndAttachCheckbox();

      if (!toggle) {
        toggle = createElementFromHTML(toggleDiv);

        document
          .querySelector(
            'body > div > div > div > div > div._main > div.Contents > div._summary'
          )
          .insertAdjacentElement('afterend', toggle);

        document.querySelector('#showAll').addEventListener('change', () => {
          showAll = !showAll;
          markFinishedAndAttachCheckbox();
        });
      }
    });
}
