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
// FETCH SONGS (JSON BASED)
// =======================
async function GetSongs(folder) {
  currFolder = folder;

  const res = await fetch(`${folder}/info.json`);
  const data = await res.json();

  currentArtist = data.artist || "Unknown Artist";

  return data.songs.map(song => ({
    name: song.replace(/\.mp3$/i, "").replace(/[_-]/g, " "),
    path: `${folder}/${encodeURIComponent(song)}`
  }));
}

// =======================
// TIME FORMAT
// =======================
function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" + secs : secs}`;
}

// =======================
// PLAY MUSIC
// =======================
function playMusic(path, name) {
  if (currentAudio) currentAudio.pause();

  currentAudio = new Audio(path);

  currentAudio.onplay = () => playBtn.src = "pause.svg";
  currentAudio.onpause = () => playBtn.src = "play.svg";

  currentAudio.onloadedmetadata = () => {
    document.querySelector(".songtime").innerText =
      `00:00 / ${formatTime(currentAudio.duration)}`;
  };

  currentAudio.ontimeupdate = () => {
    if (!currentAudio.duration) return;

    const percent =
      (currentAudio.currentTime / currentAudio.duration) * 100;

    document.querySelector(".circle").style.left = percent + "%";
    document.querySelector(".songtime").innerText =
      `${formatTime(currentAudio.currentTime)} / ${formatTime(currentAudio.duration)}`;
  };

  document.querySelector(".songinfo").innerText = name;
  currentAudio.play();
}

// =======================
// LOAD FOLDER SONGS
// =======================
async function loadFolder(folder) {
  allSongs = await GetSongs(folder);
  currentIndex = 0;

  const songUL = document.querySelector(".songlist ul");
  songUL.innerHTML = "";

  allSongs.forEach((song, i) => {
    songUL.innerHTML += `
      <li data-index="${i}">
        <img class="invert" src="music.svg">
        <div class="info">
          <div class="song-title">${song.name}</div>
          <div class="artist">${currentArtist}</div>
        </div>
      </li>
    `;
  });

  document.querySelectorAll(".songlist li").forEach(li => {
    li.onclick = () => {
      currentIndex = Number(li.dataset.index);
      playMusic(allSongs[currentIndex].path, allSongs[currentIndex].name);
      highlightCurrent();
    };
  });

  if (allSongs.length) {
    playMusic(allSongs[0].path, allSongs[0].name);
    highlightCurrent();
  }
}

// =======================
// HIGHLIGHT CURRENT
// =======================
function highlightCurrent() {
  document.querySelectorAll(".songlist li").forEach((li, i) => {
    li.classList.toggle("active", i === currentIndex);
  });
}

// =======================
// DISPLAY ALBUMS
// =======================
async function displayAlbums() {
  const albums = ["a3"];
 // 👈 add more albums here

  const container = document.querySelector(".card-container");
  container.innerHTML = "";

  for (const album of albums) {
    const res = await fetch(`songs/${album}/info.json`);
    const meta = await res.json();

    container.innerHTML += `
      <div class="card" data-folder="songs/${album}">
        <div class="img-wrap">
          <img src="/songs/${album}/cover.jpg">
          <div class="play-btn">▶</div>
        </div>
        <h2>${meta.title}</h2>
        <p>${meta.description}</p>
      </div>
    `;
  }

  container.onclick = e => {
    const card = e.target.closest(".card");
    if (!card) return;
    loadFolder(card.dataset.folder);
  };
}

// =======================
// MAIN
// =======================
async function main() {
  playBtn = document.getElementById("play");

  await displayAlbums();

  playBtn.onclick = () => {
    if (!currentAudio) return;
    currentAudio.paused ? currentAudio.play() : currentAudio.pause();
  };

  document.getElementById("next").onclick = () => {
    if (!allSongs.length) return;
    currentIndex = (currentIndex + 1) % allSongs.length;
    playMusic(allSongs[currentIndex].path, allSongs[currentIndex].name);
    highlightCurrent();
  };

  document.getElementById("previous").onclick = () => {
    if (!allSongs.length) return;
    currentIndex =
      (currentIndex - 1 + allSongs.length) % allSongs.length;
    playMusic(allSongs[currentIndex].path, allSongs[currentIndex].name);
    highlightCurrent();
  };

  document.querySelector(".seekbar").onclick = e => {
    if (!currentAudio) return;
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    currentAudio.currentTime = percent * currentAudio.duration;
  };

  document.querySelector(".search input").oninput = e => {
    const value = e.target.value.toLowerCase();
    document.querySelectorAll(".songlist li").forEach(li => {
      li.style.display = li.innerText.toLowerCase().includes(value)
        ? "flex"
        : "none";
    });
  };

  document.querySelector(".range input").oninput = e => {
    if (currentAudio) currentAudio.volume = e.target.value / 100;
  };
}

main();


