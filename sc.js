console.log("javascript loaded");

// =======================
// GLOBALS
// =======================

let currentAudio = null;
let playBtn = null;
let currentIndex = 0;
let allSongs = [];
let currFolder = "";
let currentArtist = "Unknown Artist";


// =======================
// FETCH SONGS FROM FOLDER
// =======================
async function GetSongs(folder) {
  currFolder = folder;

  let res = await fetch(`http://127.0.0.1:3000/${folder}/`);
  let html = await res.text();

  let div = document.createElement("div");
  div.innerHTML = html;

  let songs = [];
  let links = div.querySelectorAll("a");

  for (let a of links) {
    // ✅ FIX: case-insensitive mp3 check
    if (a.href.toLowerCase().endsWith(".mp3")) {
      let url = new URL(a.href);
      let filename = decodeURIComponent(url.pathname);

      let displayName = filename
        .split(/[/\\]/).pop()
        .replace(/\.mp3$/i, "")
        .replace(/[_-]/g, " ")
        .replace(/\b\d+\s*kbps\b/i, "")
        .trim();

      songs.push({
        name: displayName,
        path: a.href
      });
    }
  }

  return songs;
}

// =======================
// TIME FORMAT
// =======================
function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  let mins = Math.floor(seconds / 60);
  let secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" + secs : secs}`;
}

// =======================
// PLAY MUSIC
// =======================
function playMusic(path, name) {
  if (currentAudio) currentAudio.pause();

  currentAudio = new Audio(path);

  currentAudio.addEventListener("play", () => {
    playBtn.src = "pause.svg";
  });

  currentAudio.addEventListener("pause", () => {
    playBtn.src = "play.svg";
  });

  currentAudio.addEventListener("loadedmetadata", () => {
    document.querySelector(".songtime").innerHTML =
      `00:00 / ${formatTime(currentAudio.duration)}`;
  });

  currentAudio.addEventListener("timeupdate", () => {
    if (!currentAudio.duration) return;

    let percent =
      (currentAudio.currentTime / currentAudio.duration) * 100;

    document.querySelector(".circle").style.left = percent + "%";

    document.querySelector(".songtime").innerHTML =
      `${formatTime(currentAudio.currentTime)} / ${formatTime(currentAudio.duration)}`;
  });

  document.querySelector(".songinfo").innerHTML = name;

  currentAudio.play();
}

// =======================
// LOAD FOLDER SONGS
// =======================
async function loadFolder(folder) {
  console.log("Loading folder:", folder);

  let songs = await GetSongs(folder);
  console.log("Songs found:", songs);

  allSongs = songs;
  currentIndex = 0;

  let songUL = document.querySelector(".songlist ul");
  songUL.innerHTML = "";

  songs.forEach((song, i) => {
    songUL.innerHTML += `
      <li data-index="${i}" data-path="${song.path}" data-name="${song.name}">
        <img class="invert" src="music.svg">
        <div class="info">
          <div class="song-title">${song.name}</div>
          <div class="artist">${currentArtist}</div>
        </div>
        <span class="PlayNow">
          Play Now
          <img class="invert" src="play.svg">
        </span>
      </li>
    `;
  });

  document.querySelectorAll(".songlist li").forEach(li => {
    li.addEventListener("click", () => {
      currentIndex = Number(li.dataset.index);
      playMusic(li.dataset.path, li.dataset.name);
      highlightCurrent();
    });
  });

  // auto play first song
  if (allSongs.length > 0) {
    playMusic(allSongs[0].path, allSongs[0].name);
    highlightCurrent();
  }
}

// =======================
// HIGHLIGHT CURRENT SONG
// =======================
function highlightCurrent() {
  document.querySelectorAll(".songlist li").forEach(li => {
    li.classList.toggle(
      "active",
      Number(li.dataset.index) === currentIndex
    );
  });
}
async function displayAlbums() {
  console.log("displayAlbums running");

  let res = await fetch("http://127.0.0.1:3000/songs/");
  let htmlText = await res.text();

  let div = document.createElement("div");
  div.innerHTML = htmlText;

  let anchors = Array.from(div.querySelectorAll("a"));
  let cardContainer = document.querySelector(".card-container");
  cardContainer.innerHTML = "";

  for (let a of anchors) {
    if (a.href.endsWith("/") && !a.innerText.includes("..")) {

      let album = decodeURIComponent(a.href)
        .replace(/\\/g, "/")
        .split("/")
        .filter(Boolean)
        .pop();

      try {
        let metaRes = await fetch(
          `http://127.0.0.1:3000/songs/${album}/info.json`
        );

        if (!metaRes.ok) continue;

        let meta = await metaRes.json();
        currentArtist = meta.artist || "Artist";

        cardContainer.innerHTML += `
          <div class="card" data-folder="songs/${album}">
            <div class="img-wrap">
              <img src="/songs/${album}/cover.jpg" alt="${meta.title}">
              <div class="play-btn">▶</div>
            </div>
            <h2>${meta.title}</h2>
            <p>${meta.description}</p>
          </div>
        `;

      } catch (err) {
        console.log(`No info.json for ${album}`);
      }
    }
  }

  // ✅ ONE click listener for all cards
  cardContainer.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;

    const folder = card.dataset.folder;
    loadFolder(folder);

    document.querySelector(".left").style.left = "0";
  });
}



// =======================
// MAIN
// =======================
async function main() {
  playBtn = document.getElementById("play");



//Display all the albums
displayAlbums(); 


  // PLAY / PAUSE
  playBtn.addEventListener("click", () => {
    if (!currentAudio) return;
    currentAudio.paused ? currentAudio.play() : currentAudio.pause();
  });

  // NEXT
  document.getElementById("next").addEventListener("click", () => {
    if (!allSongs.length) return;
    currentIndex = (currentIndex + 1) % allSongs.length;
    playMusic(allSongs[currentIndex].path, allSongs[currentIndex].name);
    highlightCurrent();
  });

  // PREVIOUS
  document.getElementById("previous").addEventListener("click", () => {
    if (!allSongs.length) return;
    currentIndex =
      (currentIndex - 1 + allSongs.length) % allSongs.length;
    playMusic(allSongs[currentIndex].path, allSongs[currentIndex].name);
    highlightCurrent();
  });

  // SEEK BAR
  const seekbar = document.querySelector(".seekbar");
  const circle = document.querySelector(".circle");

  seekbar.addEventListener("mousedown", e => {
    if (!currentAudio || !currentAudio.duration) return;

    const rect = seekbar.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(percent, 1));

    currentAudio.currentTime = percent * currentAudio.duration;
    circle.style.left = percent * 100 + "%";
  });

  // SEARCH
  document.querySelector(".search input").addEventListener("input", e => {
    const value = e.target.value.toLowerCase();
    document.querySelectorAll(".songlist li").forEach(li => {
      li.style.display = li.dataset.name.toLowerCase().includes(value)
        ? "flex"
        : "none";
    });
  });

  // VOLUME
  document.querySelector(".range input").addEventListener("change", e => {
    if (currentAudio) currentAudio.volume = e.target.value / 100;
  });

  //add event listener to volume icon to mute/unmute

 document.querySelector(".volume img").addEventListener("click", (e) => {
  if (!currentAudio) return;

  // check filename, not full path
  if (e.target.src.includes("volume.svg")) {
    e.target.src = "mute.svg";
    currentAudio.volume = 0;
    document.querySelector(".range input").value = 0;
  } else {
    e.target.src = "volume.svg";
    currentAudio.volume = 0.1;
        document.querySelector(".range input").value = 10;
  }
});
  // HAMBURGER
  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-120%";
  });
}

main();
