// Start of code execution is after comment START_EXECUTION
let sectionsSnapshot;
let showAllEpisodes = true;
let clearButtonEventListenerSet = false;
let episodesTotalTime = 0;
let episodesCount = 0;
let userId;
let userEmail;
let firestoreDoc;

// Toggle switch
// https://codepen.io/personable/pen/stpwD

const _templateToggleDiv = () => `<div class="can-toggle demo-rebrand-1 top-offset">
<input id="showAll" type="checkbox" />
<label id="toggleLabel" for="showAll">
  <div
    class="can-toggle__switch"
    data-checked="Filter"
    data-unchecked="Off"
  ></div>
</label>
</div>`;

// Checkbox
// https://codepen.io/andreasstorm/pen/aXYzqg

const _templateCheckbox = checked => `<div class="customCheckBox">
<input type="checkbox" class="notDisplayed" ${
  checked ? 'checked="checked"' : ''
} />
<label class="cbx ${checked ? 'cbx-checked' : ''}">
  <div class="flip ${checked ? 'cbx-flip-checked' : ''}">
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

function writeToFirestore() {
  firestoreDoc
    .set({
      sectionsSnapshot,
      email: userEmail
    })
    .catch(function(error) {
      console.error('Error writing document: ', error);
    });
}

function updateSnapshot() {
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

  sectionsSnapshot = newSnapshot;
  writeToFirestore();
}

function processSingleEpisode(episodeFromSnapshot, episodeName, episode) {
  if (!episodeFromSnapshot) {
    return;
  }

  // give css classes to episodes according to their state
  const checked = episodeFromSnapshot && episodeFromSnapshot.finished;
  if (checked) {
    if (!showAllEpisodes) {
      episode.classList.add('hideElement');
    } else {
      episode.classList.remove('hideElement');
    }
    episodeName.classList.add('finished');
  } else {
    episode.classList.remove('hideElement');
    episodeName.classList.remove('finished');
  }

  // count number of episodes and duration time
  if (!checked || showAllEpisodes) {
    episodesCount++;

    const duration = episodeFromSnapshot.duration;
    const durationStrings = duration.split(':');
    const durationSeconds =
      Number(durationStrings[0]) * 60 + Number(durationStrings[1]);

    episodesTotalTime += durationSeconds;
  }

  // if there is no checkbox, add one
  if (!episode.querySelector('div.customCheckBox')) {
    // creating checkbox
    const checkbox = createElementFromHTML(_templateCheckbox(checked));

    episode
      .querySelector('div._content')
      .insertAdjacentElement('afterend', checkbox);
    //------------------------------------------------------------

    // on label click stop propagation and do checkbox input click
    episode
      .querySelector('div.customCheckBox > label')
      .addEventListener('click', event => {
        event.stopPropagation();
        checkbox.parentElement.querySelector('input').click();
      });
    //------------------------------------------------------------

    const input = episode.querySelector('div.customCheckBox > input');

    // on checkbox input click stop propagation
    input.addEventListener('click', event => {
      event.stopPropagation();
    });
    //------------------------------------------------------------

    // on checkbox input change animate checkbox label and write to firestore
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

      // use timeout because css classes animation will last for 300ms
      setTimeout(() => {
        writeToFirestore();
      }, 300);
    });
    //------------------------------------------------------------
  } else {
    // for existing checkbox, if snapshot changed, synchronize checkbox input
    const input = episode.querySelector('div.customCheckBox > input');
    if (checked !== input.checked) {
      input.click();
    }
  }
}

function processEpisodes() {
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

          processSingleEpisode(episodeFromSnapshot, episodeName, episode);
        });
      }
    });
  } else {
    const filteredEpisodes = document.querySelectorAll(
      'body > div > div > div > div > div._main > div.Contents > div > div.Episode'
    );

    filteredEpisodes.forEach(episode => {
      const episodeName = episode.querySelector('div._content > div._title');

      const episodeFromSnapshot = sectionsSnapshot
        .map(s => s.EPISODES)
        .reduce((acc, val) => acc.concat(val), [])
        .find(e => e.name === episodeName.innerHTML);

      processSingleEpisode(episodeFromSnapshot, episodeName, episode);
    });
  }

  // display episodes count and total duration

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

// START_EXECUTION
const waitForSections = setInterval(() => {
  // on page load sections are not loaded immediately, so we need to wait
  const checkSections = getSections();

  if (checkSections.length > 0) {
    clearInterval(waitForSections);

    main();
  }
}, 50);

async function main() {
  // take react props data and extract email and id; if none, exit from main()
  const reactDataPropsRaw = document
    .querySelector('body > div > div > div')
    .getAttribute('data-react-props');

  const reactDataProps = JSON.parse(reactDataPropsRaw);

  if (!reactDataProps.user) {
    return;
  }

  userId = reactDataProps.user.id.toString();
  userEmail = reactDataProps.user.email;
  //------------------------------------------------------------

  // if there is no document in firestore related to user id, create one
  const database = firebase.firestore();
  firestoreDoc = database.collection('bookmarks').doc(userId);

  const docSnapshot = await firestoreDoc.get();

  if (!docSnapshot.exists) {
    firestoreDoc.set({ sectionsSnapshot: [], email: userEmail });
  }
  //------------------------------------------------------------

  // create toggle element for show all/unfinished episodes
  const toggleDOMElement = createElementFromHTML(_templateToggleDiv());

  document
    .querySelector(
      'body > div > div > div > div > div._main > div.Contents > div._summary'
    )
    .insertAdjacentElement('afterend', toggleDOMElement);

  document.querySelector('#showAll').addEventListener('change', () => {
    showAllEpisodes = !showAllEpisodes;
    processEpisodes();
  });
  //------------------------------------------------------------

  // on snapshot change update snapshot and process episodes
  firestoreDoc.onSnapshot(doc => {
    sectionsSnapshot = doc.data().sectionsSnapshot;
    updateSnapshot();
    processEpisodes();
  });
  //------------------------------------------------------------

  // add event listener on search box input
  document
    .querySelector(
      'body > div > div > div > div > div._main > div.Contents > div.bp3-input-group.SearchBox > input'
    )
    .addEventListener('input', () =>
      // if not using setTimeout, origin code overwrites result
      setTimeout(() => {
        processEpisodes();

        // add event listener on clear button
        const clearButton = document.querySelector(
          'body > div > div > div > div > div._main > div.Contents > div.bp3-input-group.SearchBox > span.bp3-input-action > button'
        );
        if (clearButton && !clearButtonEventListenerSet) {
          // if there is clear button and it's not yet set, then add event listener
          clearButtonEventListenerSet = true;
          clearButton.addEventListener('click', () => {
            // if not using setTimeout, origin code overwrites result
            setTimeout(() => {
              processEpisodes();
            }, 0);
          });
        } else if (!clearButton && clearButtonEventListenerSet) {
          // if there is no clear button and it's been set, then reset variable so next time it can be set
          clearButtonEventListenerSet = false;
        }
        //------------------------------------------------------------
      }, 0)
    );
  //------------------------------------------------------------
}
