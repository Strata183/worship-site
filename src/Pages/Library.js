import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Turn a file name like "Amazing Grace (Key of G).pdf" into a safer storage
// name like "amazing-grace-key-of-g". This avoids spaces and unusual symbols.
function cleanFileName(name) {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Supabase Edge Function errors can contain useful details in the HTTP response.
// This helper tries to pull out the clearest message for the user.
async function getFunctionErrorMessage(error) {
  if (error?.context instanceof Response) {
    try {
      const body = await error.context.json();

      if (body?.error) {
        return body.error;
      }
    } catch {
      try {
        const text = await error.context.text();

        if (text) {
          return text;
        }
      } catch {
        // Fall back to the Supabase client error message below.
      }
    }
  }

  return error?.message || "Unexpected Edge Function error.";
}

const songKeyOptions = [
  "C",
  "C#/Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#/Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const customKeyValue = "__custom_key__";

function isPresetSongKey(songKey) {
  return songKeyOptions.includes(songKey);
}

function isAudioFile(file) {
  const audioExtensions = [".aac", ".aiff", ".m4a", ".mp3", ".ogg", ".wav", ".webm"];
  const lowerName = file.name.toLowerCase();

  return (
    file.type.startsWith("audio/") ||
    audioExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

function SongResourceAudio({ resource }) {
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");

  useEffect(() => {
    let ignoreResponse = false;

    async function loadAudioUrl() {
      const { data, error } = await supabase.functions.invoke("r2-song-files", {
        body: {
          action: "song-resource-audio-signed-url",
          resourceId: resource.id,
        },
      });

      if (ignoreResponse) {
        return;
      }

      if (error) {
        setAudioUrl("");
        setAudioError(await getFunctionErrorMessage(error));
        return;
      }

      setAudioError("");
      setAudioUrl(data.signedUrl);
    }

    loadAudioUrl();

    return () => {
      ignoreResponse = true;
    };
  }, [resource.id]);

  if (audioError) {
    return <p className="song-resource-muted">{audioError}</p>;
  }

  if (!audioUrl) {
    return <p className="song-resource-muted">Loading audio...</p>;
  }

  return (
    <audio controls src={audioUrl}>
      Your browser does not support the audio element.
    </audio>
  );
}

// Library is the protected My Library page.
// Signed-in users can upload, open, edit, and delete their own PDF songs.
function Library() {
  const { user } = useAuth();

  // songs holds the rows loaded from the Supabase "songs" table.
  const [songs, setSongs] = useState([]);
  const [songResources, setSongResources] = useState({});
  const [friendships, setFriendships] = useState([]);
  const [activeShelf, setActiveShelf] = useState("mine");
  const [expandedSongId, setExpandedSongId] = useState(null);

  // title and file track the upload form inputs.
  const [title, setTitle] = useState("");
  const [songKey, setSongKey] = useState("");
  const [customSongKey, setCustomSongKey] = useState("");
  const [file, setFile] = useState(null);

  // These states only affect how the current song list is displayed.
  // They do not change anything in the database.
  const [searchQuery, setSearchQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState("all");
  const [sortMode, setSortMode] = useState("key");

  // These states control the inline edit form for a song row.
  const [editingSongId, setEditingSongId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSongKey, setEditSongKey] = useState("");
  const [customEditSongKey, setCustomEditSongKey] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // loadingSongs controls the "Loading songs..." message.
  const [loadingSongs, setLoadingSongs] = useState(true);

  // submitting prevents duplicate uploads while one upload is already running.
  const [submitting, setSubmitting] = useState(false);
  const [copyingSongId, setCopyingSongId] = useState(null);
  const [savingResourceSongId, setSavingResourceSongId] = useState(null);
  const [deletingResourceId, setDeletingResourceId] = useState(null);
  const [resourceForms, setResourceForms] = useState({});
  const [setlistFolders, setSetlistFolders] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [setlistItems, setSetlistItems] = useState([]);
  const [currentSetlistFolderId, setCurrentSetlistFolderId] = useState(null);
  const [selectedSetlistId, setSelectedSetlistId] = useState(null);
  const [newSetlistFolderName, setNewSetlistFolderName] = useState("");
  const [newSetlistTitle, setNewSetlistTitle] = useState("");
  const [newSetlistDate, setNewSetlistDate] = useState("");
  const [newSetlistNotes, setNewSetlistNotes] = useState("");
  const [setlistSongId, setSetlistSongId] = useState("");
  const [placeholderTitle, setPlaceholderTitle] = useState("");
  const [placeholderBody, setPlaceholderBody] = useState("");
  const [savingSetlistAction, setSavingSetlistAction] = useState(false);

  // message and error display feedback below the upload form.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Load songs once when the Library page first appears.
    loadSongs();
    loadSetlistWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSongs() {
    setLoadingSongs(true);
    setError("");

    // RLS decides which rows this user is allowed to see. The shelves below
    // split those visible songs into mine and friends.
    const [songsResult, friendshipsResult] = await Promise.all([
      supabase.from("songs").select("*").order("created_at", { ascending: false }),
      supabase.rpc("list_friendships_with_profiles"),
    ]);

    const { data, error: songsError } = songsResult;
    const { data: friendshipsData, error: friendshipsError } = friendshipsResult;

    if (songsError) {
      setError(songsError.message);
    } else if (friendshipsError) {
      setError(friendshipsError.message);
    } else {
      setSongs(data || []);
      setFriendships(friendshipsData || []);
    }

    setLoadingSongs(false);
  }

  async function loadSetlistWorkspace() {
    const [foldersResult, setlistsResult, itemsResult] = await Promise.all([
      supabase
        .from("setlist_folders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("setlists")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("setlist_items")
        .select("*")
        .order("position", { ascending: true }),
    ]);

    if (foldersResult.error) {
      setError(foldersResult.error.message);
      return;
    }

    if (setlistsResult.error) {
      setError(setlistsResult.error.message);
      return;
    }

    if (itemsResult.error) {
      setError(itemsResult.error.message);
      return;
    }

    setSetlistFolders(foldersResult.data || []);
    setSetlists(setlistsResult.data || []);
    setSetlistItems(itemsResult.data || []);
  }

  useEffect(() => {
    async function loadSongResources() {
      if (songs.length === 0) {
        setSongResources({});
        return;
      }

      const { data, error: resourceError } = await supabase
        .from("song_resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (resourceError) {
        setError(resourceError.message);
        setSongResources({});
        return;
      }

      setSongResources(
        (data || []).reduce((resourceMap, resource) => {
          if (!resourceMap[resource.song_id]) {
            resourceMap[resource.song_id] = [];
          }

          resourceMap[resource.song_id].push(resource);
          return resourceMap;
        }, {})
      );
    }

    loadSongResources();
  }, [songs]);

  async function handleUpload(event) {
    // Prevent the browser from refreshing the page after form submit.
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    // Basic frontend validation gives quick feedback before calling Supabase.
    if (!file) {
      setError("Choose a PDF before uploading.");
      setSubmitting(false);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files can be uploaded.");
      setSubmitting(false);
      return;
    }

    const savedSongKey =
      songKey === customKeyValue ? customSongKey.trim() : songKey;

    if (!savedSongKey) {
      setError("Choose a key for the song before uploading.");
      setSubmitting(false);
      return;
    }

    // Create an id in the browser so the file path and database row can match.
    const songId = crypto.randomUUID();
    const safeName = cleanFileName(file.name) || "song";

    // Store each user's files inside a folder named with their Supabase user id.
    // The Edge Function checks this too, so users cannot upload into another
    // user's folder by changing frontend code.
    const filePath = `${user.id}/${songId}-${safeName}.pdf`;

    // If the user leaves the title blank, use the PDF file name without ".pdf".
    const songTitle = title.trim() || file.name.replace(/\.pdf$/i, "");

    // FormData is required because a real file is being sent to the Edge Function.
    const formData = new FormData();

    formData.append("action", "upload");
    formData.append("filePath", filePath);
    formData.append("file", file);

    // The Edge Function uploads the PDF to Cloudflare R2.
    // The browser does not receive direct R2 credentials, which keeps them secret.
    const { error: uploadError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: formData,
      }
    );

    if (uploadError) {
      setError(`PDF upload failed: ${await getFunctionErrorMessage(uploadError)}`);
      setSubmitting(false);
      return;
    }

    // After the file exists in storage, save the searchable metadata in Supabase.
    const { error: insertError } = await supabase.from("songs").insert({
      id: songId,
      owner_id: user.id,
      title: songTitle,
      song_key: savedSongKey,
      file_path: filePath,
    });

    if (insertError) {
      setError(`Song save failed: ${insertError.message}`);
    } else {
      // Reset the form and reload the list so the new song appears.
      setMessage("Song uploaded.");
      setTitle("");
      setSongKey("");
      setCustomSongKey("");
      setFile(null);
      event.target.reset();
      await loadSongs();
    }

    setSubmitting(false);
  }

  async function openPdf(song) {
    setError("");

    // Ask the Edge Function for a temporary signed URL.
    // This lets the user open the PDF without making the R2 bucket public.
    const { data, error: signedUrlError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "signed-url",
          songId: song.id,
        },
      }
    );

    if (signedUrlError) {
      setError(await getFunctionErrorMessage(signedUrlError));
      return;
    }

    // Open the signed URL in a new browser tab.
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteSong(song) {
    setError("");
    setMessage("");

    // First delete the actual PDF file from R2 through the Edge Function.
    const { error: storageError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "delete",
          songId: song.id,
        },
      }
    );

    if (storageError) {
      setError(await getFunctionErrorMessage(storageError));
      return;
    }

    // Then delete the database row from Supabase.
    // Doing both keeps the database and file storage in sync.
    const { error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("id", song.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Song deleted.");
      await loadSongs();
    }
  }

  async function copySongToMyLibrary(song) {
    if (song.owner_id === user.id) {
      return;
    }

    setCopyingSongId(song.id);
    setError("");
    setMessage("");

    const copiedSongId = crypto.randomUUID();
    const safeName = cleanFileName(song.title || "song") || "song";
    const targetFilePath = `${user.id}/${copiedSongId}-${safeName}.pdf`;

    const { data: copyData, error: copyError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "copy-song-file",
          songId: song.id,
          targetFilePath,
        },
      }
    );

    if (copyError) {
      setError(await getFunctionErrorMessage(copyError));
      setCopyingSongId(null);
      return;
    }

    const { error: insertError } = await supabase.from("songs").insert({
      copied_from_song_id: song.id,
      file_path: copyData.filePath,
      id: copiedSongId,
      owner_id: user.id,
      song_key: song.song_key,
      title: song.title,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage(`"${song.title}" was added to My Library.`);
      await loadSongs();
    }

    setCopyingSongId(null);
  }

  function getResourceForm(songId) {
    return (
      resourceForms[songId] || {
        audioFile: null,
        body: "",
        title: "",
        type: "note",
        url: "",
      }
    );
  }

  function updateResourceForm(songId, field, value) {
    setResourceForms((currentForms) => ({
      ...currentForms,
      [songId]: {
        ...getResourceForm(songId),
        [field]: value,
      },
    }));
  }

  async function saveSongResource(song) {
    const resourceForm = getResourceForm(song.id);
    const resourceTitle = resourceForm.title.trim();
    const resourceBody = resourceForm.body.trim();
    const resourceUrl = resourceForm.url.trim();

    setError("");
    setMessage("");

    if (song.owner_id !== user.id) {
      setError("Only the song owner can add resources.");
      return;
    }

    if (resourceForm.type === "link" && !resourceUrl) {
      setError("Add a link URL first.");
      return;
    }

    if (resourceForm.type === "note" && !resourceTitle && !resourceBody) {
      setError("Add a note title or note text first.");
      return;
    }

    if (resourceForm.type === "audio" && !resourceForm.audioFile) {
      setError("Choose an audio file first.");
      return;
    }

    if (resourceForm.type === "audio" && !isAudioFile(resourceForm.audioFile)) {
      setError("Please choose an audio file.");
      return;
    }

    setSavingResourceSongId(song.id);

    let filePath = "";
    let contentType = "";

    if (resourceForm.type === "audio") {
      const resourceId = crypto.randomUUID();
      const extension = resourceForm.audioFile.name.split(".").pop() || "audio";
      const safeName = cleanFileName(resourceTitle || song.title || "demo") || "demo";
      filePath = `${user.id}/song-resources/${song.id}/${resourceId}-${safeName}.${extension}`;
      contentType = resourceForm.audioFile.type;

      const formData = new FormData();
      formData.append("action", "upload");
      formData.append("filePath", filePath);
      formData.append("file", resourceForm.audioFile);

      const { error: uploadError } = await supabase.functions.invoke(
        "r2-song-files",
        {
          body: formData,
        }
      );

      if (uploadError) {
        setError(`Audio upload failed: ${await getFunctionErrorMessage(uploadError)}`);
        setSavingResourceSongId(null);
        return;
      }
    }

    const { error: insertError } = await supabase.from("song_resources").insert({
      body: resourceBody,
      content_type: contentType,
      file_path: filePath,
      owner_id: user.id,
      resource_type: resourceForm.type,
      song_id: song.id,
      title: resourceTitle,
      url: resourceUrl,
    });

    if (insertError) {
      setError(`Resource save failed: ${insertError.message}`);
      setSavingResourceSongId(null);
      return;
    }

    setResourceForms((currentForms) => ({
      ...currentForms,
      [song.id]: {
        audioFile: null,
        body: "",
        title: "",
        type: "note",
        url: "",
      },
    }));
    setMessage("Resource added.");
    setSavingResourceSongId(null);
    await loadSongs();
  }

  async function deleteSongResource(resource) {
    setDeletingResourceId(resource.id);
    setError("");
    setMessage("");

    const { error: storageError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "delete-song-resource-file",
          resourceId: resource.id,
        },
      }
    );

    if (storageError) {
      setError(await getFunctionErrorMessage(storageError));
      setDeletingResourceId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from("song_resources")
      .delete()
      .eq("id", resource.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Resource deleted.");
      await loadSongs();
    }

    setDeletingResourceId(null);
  }

  function startEditingSong(song) {
    // Copy the current row values into temporary edit state.
    // The database is not changed until saveSongEdit runs.
    setEditingSongId(song.id);
    setEditTitle(song.title || "");
    setEditSongKey(isPresetSongKey(song.song_key) ? song.song_key : customKeyValue);
    setCustomEditSongKey(isPresetSongKey(song.song_key) ? "" : song.song_key || "");
    setMessage("");
    setError("");
  }

  function cancelEditingSong() {
    // Leave edit mode and clear the temporary form values.
    setEditingSongId(null);
    setEditTitle("");
    setEditSongKey("");
    setCustomEditSongKey("");
  }

  async function saveSongEdit(song) {
    // Trim keeps users from saving a title that only contains spaces.
    const nextTitle = editTitle.trim();

    if (!nextTitle) {
      setError("Song title cannot be blank.");
      return;
    }

    const savedEditSongKey =
      editSongKey === customKeyValue ? customEditSongKey.trim() : editSongKey;

    if (!savedEditSongKey) {
      setError("Choose a key for the song.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("songs")
      .update({
        title: nextTitle,
        song_key: savedEditSongKey,
      })
      // Both filters matter: id picks the row, owner_id makes the update
      // owner-only even if a shared song is visible in this list.
      .eq("id", song.id)
      .eq("owner_id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Song updated.");
      cancelEditingSong();
      await loadSongs();
    }

    setSavingEdit(false);
  }

  const acceptedFriends = useMemo(
    () =>
      friendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => ({
          id:
            friendship.requester_id === user.id
              ? friendship.addressee_id
              : friendship.requester_id,
          name:
            friendship.other_display_name ||
            friendship.other_email ||
            "Friend",
        }))
        .sort((firstFriend, secondFriend) =>
          firstFriend.name.localeCompare(secondFriend.name)
        ),
    [friendships, user.id]
  );

  const friendsById = useMemo(
    () =>
      acceptedFriends.reduce((friendMap, friend) => {
        friendMap[friend.id] = friend;
        return friendMap;
      }, {}),
    [acceptedFriends]
  );

  // This prepares the list for the screen: filter by shelf, friend, search, and sort.
  // It does not re-query Supabase.
  const visibleSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return songs
      .filter((song) => {
        const isMine = song.owner_id === user.id;

        if (activeShelf === "mine" && !isMine) {
          return false;
        }

        if (activeShelf === "friends" && isMine) {
          return false;
        }

        if (
          activeShelf === "friends" &&
          friendFilter !== "all" &&
          song.owner_id !== friendFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const ownerName = friendsById[song.owner_id]?.name || "";

        return (
          song.title?.toLowerCase().includes(query) ||
          ownerName.toLowerCase().includes(query)
        );
      })
      .sort((firstSong, secondSong) => {
        if (sortMode === "newest") {
          return new Date(secondSong.created_at || 0) - new Date(firstSong.created_at || 0);
        }

        if (sortMode === "oldest") {
          return new Date(firstSong.created_at || 0) - new Date(secondSong.created_at || 0);
        }

        if (sortMode === "key") {
          const firstKey = songKeyOptions.indexOf(firstSong.song_key);
          const secondKey = songKeyOptions.indexOf(secondSong.song_key);
          const firstKeyIndex = firstKey === -1 ? songKeyOptions.length : firstKey;
          const secondKeyIndex = secondKey === -1 ? songKeyOptions.length : secondKey;

          if (firstKeyIndex !== secondKeyIndex) {
            return firstKeyIndex - secondKeyIndex;
          }

          return (firstSong.title || "").localeCompare(secondSong.title || "");
        }

        return (firstSong.title || "").localeCompare(secondSong.title || "");
      });
  }, [activeShelf, friendFilter, friendsById, searchQuery, songs, sortMode, user.id]);

  const mySongsCount = songs.filter((song) => song.owner_id === user.id).length;
  const friendSongsCount = songs.filter((song) => song.owner_id !== user.id).length;
  const isMyShelf = activeShelf === "mine";
  const isFriendsShelf = activeShelf === "friends";
  const isSetlistsShelf = activeShelf === "setlists";
  const selectedFriendSongsCount =
    friendFilter === "all"
      ? friendSongsCount
      : songs.filter((song) => song.owner_id === friendFilter).length;
  const copiedSongSourceIds = useMemo(
    () =>
      new Set(
        songs
          .filter((song) => song.owner_id === user.id && song.copied_from_song_id)
          .map((song) => song.copied_from_song_id)
      ),
    [songs, user.id]
  );
  const myLibrarySongs = useMemo(
    () =>
      songs
        .filter((song) => song.owner_id === user.id)
        .sort((firstSong, secondSong) =>
          (firstSong.title || "").localeCompare(secondSong.title || "")
        ),
    [songs, user.id]
  );
  const currentSetlistFolder = setlistFolders.find(
    (folder) => folder.id === currentSetlistFolderId
  );
  const childSetlistFolders = setlistFolders
    .filter((folder) => folder.parent_folder_id === currentSetlistFolderId)
    .sort((firstFolder, secondFolder) =>
      firstFolder.name.localeCompare(secondFolder.name)
    );
  const currentFolderSetlists = setlists
    .filter((setlist) => setlist.folder_id === currentSetlistFolderId)
    .sort((firstSetlist, secondSetlist) => {
      if (firstSetlist.event_date && secondSetlist.event_date) {
        return new Date(secondSetlist.event_date) - new Date(firstSetlist.event_date);
      }

      if (firstSetlist.event_date) {
        return -1;
      }

      if (secondSetlist.event_date) {
        return 1;
      }

      return (firstSetlist.title || "").localeCompare(secondSetlist.title || "");
    });
  const selectedSetlist =
    setlists.find((setlist) => setlist.id === selectedSetlistId) ||
    currentFolderSetlists[0] ||
    null;
  const selectedSetlistItems = selectedSetlist
    ? setlistItems
        .filter((item) => item.setlist_id === selectedSetlist.id)
        .sort((firstItem, secondItem) => firstItem.position - secondItem.position)
    : [];
  const songsById = useMemo(
    () =>
      songs.reduce((songMap, song) => {
        songMap[song.id] = song;
        return songMap;
      }, {}),
    [songs]
  );
  const setlistBreadcrumbs = useMemo(() => {
    const folderMap = setlistFolders.reduce((folderLookup, folder) => {
      folderLookup[folder.id] = folder;
      return folderLookup;
    }, {});
    const breadcrumbs = [];
    let nextFolder = currentSetlistFolderId
      ? folderMap[currentSetlistFolderId]
      : null;

    while (nextFolder) {
      breadcrumbs.unshift(nextFolder);
      nextFolder = nextFolder.parent_folder_id
        ? folderMap[nextFolder.parent_folder_id]
        : null;
    }

    return breadcrumbs;
  }, [currentSetlistFolderId, setlistFolders]);
  const setlistsCount = setlists.length;

  function formatSongDate(song) {
    // Some older rows or test data may not have created_at populated.
    if (!song.created_at) {
      return "No date";
    }

    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(song.created_at));
  }

  function formatSetlistDate(dateValue) {
    if (!dateValue) {
      return "No date";
    }

    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${dateValue}T00:00:00`));
  }

  async function createSetlistFolder(event) {
    event.preventDefault();
    const folderName = newSetlistFolderName.trim();

    if (!folderName) {
      setError("Name the folder first.");
      return;
    }

    setSavingSetlistAction(true);
    setError("");
    setMessage("");

    const { error: insertError } = await supabase.from("setlist_folders").insert({
      name: folderName,
      owner_id: user.id,
      parent_folder_id: currentSetlistFolderId,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewSetlistFolderName("");
      setMessage("Folder created.");
      await loadSetlistWorkspace();
    }

    setSavingSetlistAction(false);
  }

  async function createSetlist(event) {
    event.preventDefault();
    const setlistTitle = newSetlistTitle.trim();

    if (!setlistTitle) {
      setError("Name the setlist first.");
      return;
    }

    setSavingSetlistAction(true);
    setError("");
    setMessage("");

    const { data, error: insertError } = await supabase
      .from("setlists")
      .insert({
        event_date: newSetlistDate || null,
        folder_id: currentSetlistFolderId,
        notes: newSetlistNotes.trim(),
        owner_id: user.id,
        title: setlistTitle,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewSetlistTitle("");
      setNewSetlistDate("");
      setNewSetlistNotes("");
      setSelectedSetlistId(data.id);
      setMessage("Setlist created.");
      await loadSetlistWorkspace();
    }

    setSavingSetlistAction(false);
  }

  async function addSongToSetlist(event) {
    event.preventDefault();

    if (!selectedSetlist) {
      setError("Create or choose a setlist first.");
      return;
    }

    if (!setlistSongId) {
      setError("Choose a song first.");
      return;
    }

    setSavingSetlistAction(true);
    setError("");
    setMessage("");

    const position = selectedSetlistItems.length;
    const { error: insertError } = await supabase.from("setlist_items").insert({
      item_type: "song",
      owner_id: user.id,
      position,
      setlist_id: selectedSetlist.id,
      song_id: setlistSongId,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSetlistSongId("");
      setMessage("Song added to setlist.");
      await loadSetlistWorkspace();
    }

    setSavingSetlistAction(false);
  }

  async function addPlaceholderToSetlist(event) {
    event.preventDefault();

    if (!selectedSetlist) {
      setError("Create or choose a setlist first.");
      return;
    }

    const titleText = placeholderTitle.trim();
    const bodyText = placeholderBody.trim();

    if (!titleText && !bodyText) {
      setError("Add a title or note for the blank page.");
      return;
    }

    setSavingSetlistAction(true);
    setError("");
    setMessage("");

    const position = selectedSetlistItems.length;
    const { error: insertError } = await supabase.from("setlist_items").insert({
      body: bodyText,
      item_type: "placeholder",
      owner_id: user.id,
      position,
      setlist_id: selectedSetlist.id,
      title: titleText || "Blank page",
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setPlaceholderTitle("");
      setPlaceholderBody("");
      setMessage("Blank page added.");
      await loadSetlistWorkspace();
    }

    setSavingSetlistAction(false);
  }

  async function moveSetlistItem(item, direction) {
    const currentIndex = selectedSetlistItems.findIndex(
      (setlistItem) => setlistItem.id === item.id
    );
    const nextIndex = currentIndex + direction;

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= selectedSetlistItems.length) {
      return;
    }

    const otherItem = selectedSetlistItems[nextIndex];
    setSavingSetlistAction(true);
    setError("");
    setMessage("");

    const [currentUpdate, otherUpdate] = await Promise.all([
      supabase
        .from("setlist_items")
        .update({ position: otherItem.position })
        .eq("id", item.id),
      supabase
        .from("setlist_items")
        .update({ position: item.position })
        .eq("id", otherItem.id),
    ]);

    if (currentUpdate.error) {
      setError(currentUpdate.error.message);
    } else if (otherUpdate.error) {
      setError(otherUpdate.error.message);
    } else {
      await loadSetlistWorkspace();
    }

    setSavingSetlistAction(false);
  }

  async function deleteSetlistItem(item) {
    setSavingSetlistAction(true);
    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("setlist_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Setlist item removed.");
      await loadSetlistWorkspace();
    }

    setSavingSetlistAction(false);
  }

  function openPrintableSetlist() {
    window.print();
  }

  return (
    <main className="page app-page library-page">
      <section className="library-shell">
        <aside className="library-sidebar" aria-label="Song library sections">
          <div className="library-brand-block">
            <p className="eyebrow">PDF library</p>
            <h1>
              {isSetlistsShelf
                ? "Setlists"
                : isMyShelf
                  ? "My Library"
                  : "Friends Library"}
            </h1>
            <p>
              {isSetlistsShelf
                ? "Build nested setlist folders, add songs, and prepare a clean PDF to share."
                : isMyShelf
                ? "Open your charts, organize your scores, and sort songs by title or key."
                : "Open charts shared by your accepted friends!"}
            </p>
          </div>

          <div className="library-shelves" aria-label="Library shelves">
            <button
              className={isMyShelf ? "active" : ""}
              onClick={() => setActiveShelf("mine")}
              type="button"
            >
              <span>My Library</span>
              <strong>{mySongsCount}</strong>
            </button>
            <button
              className={isFriendsShelf ? "active" : ""}
              onClick={() => setActiveShelf("friends")}
              type="button"
            >
              <span>Friends Library</span>
              <strong>{friendSongsCount}</strong>
            </button>
            <button
              className={isSetlistsShelf ? "active" : ""}
              onClick={() => setActiveShelf("setlists")}
              type="button"
            >
              <span>Setlists</span>
              <strong>{setlistsCount}</strong>
            </button>
            <button disabled type="button" title="Coming in a later step">
              <span>Folders</span>
              <strong>Next</strong>
            </button>
          </div>
        </aside>

        <section className="score-browser">
          {isSetlistsShelf ? (
            <div className="setlist-workspace">
              {message && <p className="form-message success">{message}</p>}
              {error && <p className="form-message error">{error}</p>}

              <div className="setlist-control-grid">
                <details className="setlist-control-card">
                  <summary>New folder</summary>
                  <form onSubmit={createSetlistFolder}>
                    <label>
                      Folder name
                      <input
                        onChange={(event) => setNewSetlistFolderName(event.target.value)}
                        placeholder={
                          currentSetlistFolder
                            ? `Inside ${currentSetlistFolder.name}`
                            : "Steadfast"
                        }
                        type="text"
                        value={newSetlistFolderName}
                      />
                    </label>
                    <button
                      className="primary-button"
                      disabled={savingSetlistAction}
                      type="submit"
                    >
                      Create folder
                    </button>
                  </form>
                </details>

                <details className="setlist-control-card">
                  <summary>New setlist</summary>
                  <form onSubmit={createSetlist}>
                    <label>
                      Setlist title
                      <input
                        onChange={(event) => setNewSetlistTitle(event.target.value)}
                        placeholder="Sunday Morning"
                        type="text"
                        value={newSetlistTitle}
                      />
                    </label>
                    <label>
                      Date
                      <input
                        onChange={(event) => setNewSetlistDate(event.target.value)}
                        type="date"
                        value={newSetlistDate}
                      />
                    </label>
                    <label className="setlist-form-wide">
                      Notes
                      <textarea
                        onChange={(event) => setNewSetlistNotes(event.target.value)}
                        placeholder="Optional notes for this set"
                        rows="2"
                        value={newSetlistNotes}
                      />
                    </label>
                    <button
                      className="primary-button"
                      disabled={savingSetlistAction}
                      type="submit"
                    >
                      Create setlist
                    </button>
                  </form>
                </details>
              </div>

              <div className="setlist-browser-grid">
                <aside className="setlist-folder-panel">
                  <div className="setlist-breadcrumbs" aria-label="Setlist folder path">
                    <button
                      className={!currentSetlistFolderId ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setCurrentSetlistFolderId(null);
                        setSelectedSetlistId(null);
                      }}
                    >
                      Setlists
                    </button>
                    {setlistBreadcrumbs.map((folder) => (
                      <button
                        className={folder.id === currentSetlistFolderId ? "active" : ""}
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setCurrentSetlistFolderId(folder.id);
                          setSelectedSetlistId(null);
                        }}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>

                  <div className="setlist-folder-section">
                    <h3>Folders</h3>
                    {childSetlistFolders.length === 0 ? (
                      <p className="song-resource-muted">No folders here yet.</p>
                    ) : (
                      <div className="setlist-folder-list">
                        {childSetlistFolders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => {
                              setCurrentSetlistFolderId(folder.id);
                              setSelectedSetlistId(null);
                            }}
                          >
                            <span>{folder.name}</span>
                            <strong>Open</strong>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="setlist-folder-section">
                    <h3>Setlists</h3>
                    {currentFolderSetlists.length === 0 ? (
                      <p className="song-resource-muted">No setlists in this folder yet.</p>
                    ) : (
                      <div className="setlist-picker-list">
                        {currentFolderSetlists.map((setlist) => (
                          <button
                            className={
                              selectedSetlist?.id === setlist.id ? "active" : ""
                            }
                            key={setlist.id}
                            type="button"
                            onClick={() => setSelectedSetlistId(setlist.id)}
                          >
                            <span>{setlist.title}</span>
                            <small>{formatSetlistDate(setlist.event_date)}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </aside>

                <div className="setlist-detail-panel">
                  {selectedSetlist ? (
                    <>
                      <div className="setlist-detail-heading">
                        <div>
                          <p className="eyebrow">Current setlist</p>
                          <h2>{selectedSetlist.title}</h2>
                          <span>{formatSetlistDate(selectedSetlist.event_date)}</span>
                        </div>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={openPrintableSetlist}
                        >
                          Download / print PDF
                        </button>
                      </div>

                      {selectedSetlist.notes && (
                        <p className="setlist-detail-notes">{selectedSetlist.notes}</p>
                      )}

                      <div className="setlist-add-grid">
                        <form className="setlist-add-card" onSubmit={addSongToSetlist}>
                          <h3>Add Song</h3>
                          <label>
                            Song from My Library
                            <select
                              onChange={(event) => setSetlistSongId(event.target.value)}
                              value={setlistSongId}
                            >
                              <option value="">Choose song</option>
                              {myLibrarySongs.map((song) => (
                                <option key={song.id} value={song.id}>
                                  {song.title} ({song.song_key || "No key"})
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="primary-button"
                            disabled={savingSetlistAction || myLibrarySongs.length === 0}
                            type="submit"
                          >
                            Add song
                          </button>
                        </form>

                        <form
                          className="setlist-add-card"
                          onSubmit={addPlaceholderToSetlist}
                        >
                          <h3>Add Blank Page</h3>
                          <label>
                            Title
                            <input
                              onChange={(event) => setPlaceholderTitle(event.target.value)}
                              placeholder="Prayer"
                              type="text"
                              value={placeholderTitle}
                            />
                          </label>
                          <label>
                            Text
                            <textarea
                              onChange={(event) => setPlaceholderBody(event.target.value)}
                              placeholder="Prayer, Scripture, reading, or transition note"
                              rows="3"
                              value={placeholderBody}
                            />
                          </label>
                          <button
                            className="primary-button"
                            disabled={savingSetlistAction}
                            type="submit"
                          >
                            Add blank page
                          </button>
                        </form>
                      </div>

                      <div className="setlist-print-area">
                        <div className="setlist-print-heading">
                          <h1>{selectedSetlist.title}</h1>
                          <p>{formatSetlistDate(selectedSetlist.event_date)}</p>
                          {selectedSetlist.notes && <p>{selectedSetlist.notes}</p>}
                        </div>

                        {selectedSetlistItems.length === 0 ? (
                          <div className="library-empty-state">
                            <h3>No songs yet</h3>
                            <p>Add songs or blank pages to build this setlist.</p>
                          </div>
                        ) : (
                          <ol className="setlist-item-list">
                            {selectedSetlistItems.map((item, index) => {
                              const itemSong = item.song_id
                                ? songsById[item.song_id]
                                : null;

                              return (
                                <li
                                  className={
                                    item.item_type === "placeholder"
                                      ? "placeholder-item"
                                      : ""
                                  }
                                  key={item.id}
                                >
                                  <div className="setlist-item-main">
                                    <span>{index + 1}</span>
                                    <div>
                                      <strong>
                                        {item.item_type === "song"
                                          ? itemSong?.title || "Missing song"
                                          : item.title || "Blank page"}
                                      </strong>
                                      <p>
                                        {item.item_type === "song"
                                          ? `Key: ${itemSong?.song_key || "No key"}`
                                          : item.body || "Blank page"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="setlist-item-actions">
                                    {itemSong && (
                                      <button
                                        type="button"
                                        onClick={() => openPdf(itemSong)}
                                      >
                                        Open
                                      </button>
                                    )}
                                    <button
                                      disabled={savingSetlistAction || index === 0}
                                      type="button"
                                      onClick={() => moveSetlistItem(item, -1)}
                                    >
                                      Up
                                    </button>
                                    <button
                                      disabled={
                                        savingSetlistAction ||
                                        index === selectedSetlistItems.length - 1
                                      }
                                      type="button"
                                      onClick={() => moveSetlistItem(item, 1)}
                                    >
                                      Down
                                    </button>
                                    <button
                                      disabled={savingSetlistAction}
                                      type="button"
                                      onClick={() => deleteSetlistItem(item)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="library-empty-state">
                      <h3>No setlist selected</h3>
                      <p>Create a setlist or choose one from this folder.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
          {isMyShelf && (
            <form className="upload-card upload-card-main form-stack" onSubmit={handleUpload}>
              <div className="upload-card-heading">
                <h2>Add Score</h2>
                <p>Add a PDF chart with a required song key.</p>
              </div>
              <label>
                Song title
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Amazing Grace"
                  type="text"
                  value={title}
                />
              </label>
              <label>
                Key
                <select
                  onChange={(event) => setSongKey(event.target.value)}
                  required
                  value={songKey}
                >
                  <option value="">Choose key</option>
                  {songKeyOptions.map((keyName) => (
                    <option key={keyName} value={keyName}>
                      {keyName}
                    </option>
                  ))}
                  <option value={customKeyValue}>Custom key</option>
                </select>
                {songKey === customKeyValue && (
                  <input
                    onChange={(event) => setCustomSongKey(event.target.value)}
                    placeholder="Example: C-D"
                    required
                    type="text"
                    value={customSongKey}
                  />
                )}
              </label>
              <label>
                PDF file
                <input
                  accept="application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  required
                  type="file"
                />
              </label>
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Uploading..." : "Upload score"}
              </button>
              {message && <p className="form-message success">{message}</p>}
              {error && <p className="form-message error">{error}</p>}
            </form>
          )}

          {!isMyShelf && error && <p className="form-message error">{error}</p>}

          {!isMyShelf && (
            <div className="friends-library-callout">
              <div>
                <strong>Need to add a friend?</strong>
                <p>Manage requests to unlock more shared songs.</p>
              </div>
              <Link to="/friends">Add friends</Link>
            </div>
          )}

          <div className={`library-toolbar ${isMyShelf ? "" : "friends-library-toolbar"}`}>
            <div className="library-count" aria-label="Library summary">
              <strong>{isMyShelf ? mySongsCount : selectedFriendSongsCount}</strong>
              <span>
                {(isMyShelf ? mySongsCount : selectedFriendSongsCount) === 1
                  ? "song"
                  : "songs"}
              </span>
            </div>
            {!isMyShelf && (
              <label>
                Friend
                <select
                  onChange={(event) => setFriendFilter(event.target.value)}
                  value={friendFilter}
                >
                  <option value="all">All friends</option>
                  {acceptedFriends.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Search
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isMyShelf ? "Search by title" : "Search by title or friend"}
                type="search"
                value={searchQuery}
              />
            </label>
            <label>
              Sort
              <select onChange={(event) => setSortMode(event.target.value)} value={sortMode}>
                <option value="title">Alphabetical</option>
                <option value="key">Key: C to B</option>
                <option value="newest">Newest Added</option>
                <option value="oldest">Oldest Added</option>
              </select>
            </label>
          </div>

          {loadingSongs ? (
            <p className="empty-state">Loading songs...</p>
          ) : (isMyShelf ? mySongsCount : friendSongsCount) === 0 ? (
            <div className="library-empty-state">
              <h3>{isMyShelf ? "No scores yet" : "No friend scores yet"}</h3>
              <p>
                {isMyShelf
                  ? "Upload your first PDF chart from the Add Score panel."
                  : "Songs from accepted friends will appear here."}
              </p>
              {!isMyShelf && (
                <Link className="empty-state-action" to="/friends">
                  Add or manage friends
                </Link>
              )}
            </div>
          ) : visibleSongs.length === 0 ? (
            <div className="library-empty-state">
              <h3>No matching scores</h3>
              <p>Try a different search.</p>
            </div>
          ) : (
            <ul className="score-list">
              {visibleSongs.map((song) => {
                const isOwner = song.owner_id === user.id;
                const isAlreadyCopied = copiedSongSourceIds.has(song.id);
                const isExpanded = expandedSongId === song.id;
                const resources = songResources[song.id] || [];
                const resourceForm = getResourceForm(song.id);
                // Only one row can be edited at a time.
                const isEditing = editingSongId === song.id;

                return (
                  <li key={song.id}>
                    {isEditing ? (
                      <div className="score-edit-form">
                        <label>
                          Title
                          <input
                            onChange={(event) => setEditTitle(event.target.value)}
                            type="text"
                            value={editTitle}
                          />
                        </label>
                        <label>
                          Key
                          <select
                            onChange={(event) => setEditSongKey(event.target.value)}
                            value={editSongKey}
                          >
                            <option value="">Choose key</option>
                            {songKeyOptions.map((keyName) => (
                              <option key={keyName} value={keyName}>
                                {keyName}
                              </option>
                            ))}
                            <option value={customKeyValue}>Custom key</option>
                          </select>
                          {editSongKey === customKeyValue && (
                            <input
                              onChange={(event) =>
                                setCustomEditSongKey(event.target.value)
                              }
                              placeholder="Example: C-D"
                              required
                              type="text"
                              value={customEditSongKey}
                            />
                          )}
                        </label>
                      </div>
                    ) : (
                      <div className="score-open-button">
                        <span className="score-main">
                          <span className="score-title-line">
                            <button
                              className="score-title-button"
                              type="button"
                              onClick={() => openPdf(song)}
                            >
                              <strong>{song.title}</strong>
                            </button>
                            <button
                              aria-label={
                                isExpanded ? "Hide song resources" : "Show song resources"
                              }
                              className="score-resource-trigger"
                              onClick={() => setExpandedSongId(isExpanded ? null : song.id)}
                              title="Resources"
                              type="button"
                            >
                              <span></span>
                              <span></span>
                              <span></span>
                              {resources.length > 0 && (
                                <em>{resources.length}</em>
                              )}
                            </button>
                          </span>
                          <span>
                            {isOwner
                              ? "My library"
                              : friendsById[song.owner_id]?.name || "Friends library"}{" "}
                            · Added{" "}
                            {formatSongDate(song)}
                          </span>
                        </span>
                        <span className="score-key">{song.song_key || "No key"}</span>
                      </div>
                    )}

                    <div className="score-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => saveSongEdit(song)}
                          >
                            {savingEdit ? "Saving..." : "Save"}
                          </button>
                          <button type="button" onClick={cancelEditingSong}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => openPdf(song)}>
                            Open
                          </button>
                          {isOwner && (
                            <>
                              <button type="button" onClick={() => startEditingSong(song)}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteSong(song)}>
                                Delete
                              </button>
                            </>
                          )}
                          {!isOwner && (
                            <button
                              disabled={copyingSongId === song.id || isAlreadyCopied}
                              type="button"
                              onClick={() => copySongToMyLibrary(song)}
                            >
                              {isAlreadyCopied
                                ? "Added to My Library"
                                : copyingSongId === song.id
                                  ? "Adding..."
                                  : "Add to My Library"}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="song-resource-drawer">
                        <div className="song-resource-heading">
                          <div>
                            <strong>Attached Resources</strong>
                            <span>
                              {resources.length === 0
                                ? "No resources yet."
                                : `${resources.length} attached`}
                            </span>
                          </div>
                        </div>

                        {resources.length > 0 && (
                          <div className="song-resource-list">
                            {resources.map((resource) => (
                              <article className="song-resource-card" key={resource.id}>
                                <div className="song-resource-card-copy">
                                  <div>
                                    <small>{resource.resource_type}</small>
                                    {resource.title && <h4>{resource.title}</h4>}
                                    {resource.body && <p>{resource.body}</p>}
                                    {resource.resource_type === "link" && resource.url && (
                                      <a
                                        href={resource.url}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                      >
                                        Open link
                                      </a>
                                    )}
                                  </div>

                                  {isOwner && (
                                    <button
                                      className="song-resource-delete"
                                      disabled={deletingResourceId === resource.id}
                                      type="button"
                                      onClick={() => deleteSongResource(resource)}
                                    >
                                      {deletingResourceId === resource.id
                                        ? "Deleting..."
                                        : "Delete"}
                                    </button>
                                  )}
                                </div>

                                {resource.resource_type === "audio" && (
                                  <SongResourceAudio resource={resource} />
                                )}
                              </article>
                            ))}
                          </div>
                        )}

                        {isOwner && (
                          <form
                            className="song-resource-form"
                            onSubmit={(event) => {
                              event.preventDefault();
                              saveSongResource(song);
                            }}
                          >
                            <label>
                              Type
                              <select
                                onChange={(event) =>
                                  updateResourceForm(song.id, "type", event.target.value)
                                }
                                value={resourceForm.type}
                              >
                                <option value="note">Note</option>
                                <option value="link">Link</option>
                                <option value="audio">Audio demo</option>
                              </select>
                            </label>
                            <label>
                              Title
                              <input
                                onChange={(event) =>
                                  updateResourceForm(song.id, "title", event.target.value)
                                }
                                placeholder="Demo, arrangement note, tutorial..."
                                type="text"
                                value={resourceForm.title}
                              />
                            </label>

                            {resourceForm.type === "link" && (
                              <label>
                                Link
                                <input
                                  onChange={(event) =>
                                    updateResourceForm(song.id, "url", event.target.value)
                                  }
                                  placeholder="https://..."
                                  type="url"
                                  value={resourceForm.url}
                                />
                              </label>
                            )}

                            {resourceForm.type === "audio" && (
                              <label>
                                Audio file
                                <input
                                  accept="audio/*"
                                  onChange={(event) =>
                                    updateResourceForm(
                                      song.id,
                                      "audioFile",
                                      event.target.files?.[0] || null
                                    )
                                  }
                                  type="file"
                                />
                              </label>
                            )}

                            <label className="song-resource-form-wide">
                              Notes
                              <textarea
                                onChange={(event) =>
                                  updateResourceForm(song.id, "body", event.target.value)
                                }
                                placeholder="Optional notes for this resource"
                                rows="3"
                                value={resourceForm.body}
                              />
                            </label>

                            <button
                              className="secondary-button"
                              disabled={savingResourceSongId === song.id}
                              type="submit"
                            >
                              {savingResourceSongId === song.id
                                ? "Adding..."
                                : "Add resource"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default Library;
