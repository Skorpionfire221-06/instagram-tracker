function extractUsernames(data) {
    let usernames = [];
    function search(obj) {
        if (!obj) return;
        if (typeof obj === 'object') {
            if (obj.string_list_data && Array.isArray(obj.string_list_data)) {
                obj.string_list_data.forEach(item => {
                    if (item.value) usernames.push(item.value);
                });
            }
            Object.values(obj).forEach(search);
        }
    }
    search(data);
    return usernames;
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try { resolve(JSON.parse(reader.result)); } 
            catch (e) { reject("Invalid JSON"); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Function to handle ZIP extraction in the browser
async function processZipFile(file) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    let followersArr = [];
    let followingArr = [];

    // Loop through every file inside the ZIP archive
    for (const [filename, zipEntry] of Object.entries(contents.files)) {
        // Skip folders, only look at JSON files
        if (!zipEntry.dir && filename.endsWith('.json')) {
            if (filename.toLowerCase().includes('follower')) {
                const textData = await zipEntry.async("string");
                try {
                    const jsonData = JSON.parse(textData);
                    followersArr = followersArr.concat(extractUsernames(jsonData));
                } catch(e) { console.error("Error parsing follower JSON inside ZIP"); }
            } else if (filename.toLowerCase().includes('following')) {
                const textData = await zipEntry.async("string");
                try {
                    const jsonData = JSON.parse(textData);
                    followingArr = followingArr.concat(extractUsernames(jsonData));
                } catch(e) { console.error("Error parsing following JSON inside ZIP"); }
            }
        }
    }
    return { followersArr, followingArr };
}

async function processFiles() {
    const fileInput = document.getElementById('dataFiles');

    if (fileInput.files.length === 0) {
        alert("Please select your Instagram ZIP export or JSON files.");
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    btn.innerText = "Scanning Data...";
    btn.style.opacity = "0.7";

    try {
        let allFollowers = [];
        let allFollowing = [];

        // Loop through uploaded files (works for both 1 ZIP file or 2 JSON files)
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            
            // Branch 1: User uploaded the master ZIP file
            if (file.name.toLowerCase().endsWith('.zip')) {
                const zipResults = await processZipFile(file);
                allFollowers = allFollowers.concat(zipResults.followersArr);
                allFollowing = allFollowing.concat(zipResults.followingArr);
            } 
            // Branch 2: User manually extracted and uploaded JSON files
            else if (file.name.toLowerCase().endsWith('.json')) {
                const json = await readFileAsync(file);
                const extracted = extractUsernames(json);
                
                if (file.name.toLowerCase().includes('follower')) {
                    allFollowers = allFollowers.concat(extracted);
                } else if (file.name.toLowerCase().includes('following')) {
                    allFollowing = allFollowing.concat(extracted);
                }
            }
        }

        if (allFollowers.length === 0 && allFollowing.length === 0) {
            alert("No follower/following data found. Make sure you selected the correct Instagram export.");
            btn.innerText = "Analyze Data";
            btn.style.opacity = "1";
            return;
        }

        const followersSet = new Set(allFollowers);
        const followingSet = new Set(allFollowing);

        const notFollowingBack = allFollowing.filter(user => !followersSet.has(user));
        const fans = allFollowers.filter(user => !followingSet.has(user));
        const mutuals = allFollowing.filter(user => followersSet.has(user));

        localStorage.setItem('notFollowingBack', JSON.stringify(notFollowingBack));
        localStorage.setItem('fans', JSON.stringify(fans));
        localStorage.setItem('mutuals', JSON.stringify(mutuals));

        loadDashboardStats();
        btn.innerText = "Data Synchronized!";
        setTimeout(() => {
            btn.innerText = "Analyze Data";
            btn.style.opacity = "1";
        }, 2000);

    } catch (error) {
        alert("Error processing files. Ensure you are uploading the official Instagram export.");
        console.error(error);
        btn.innerText = "Analyze Data";
        btn.style.opacity = "1";
    }
}

function loadDashboardStats() {
    const notFollowingBack = JSON.parse(localStorage.getItem('notFollowingBack') || '[]');
    const fans = JSON.parse(localStorage.getItem('fans') || '[]');
    const mutuals = JSON.parse(localStorage.getItem('mutuals') || '[]');

    const el1 = document.getElementById('count-not-following');
    const el2 = document.getElementById('count-fans');
    const el3 = document.getElementById('count-mutuals');

    if(el1) el1.innerText = notFollowingBack.length;
    if(el2) el2.innerText = fans.length;
    if(el3) el3.innerText = mutuals.length;
}

function renderListPage(storageKey) {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const listContainer = document.getElementById('data-list');
    
    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No users found or data not loaded.</div>';
        return;
    }
    
    listContainer.innerHTML = data.map(user => `<div class="list-item">${user}</div>`).join('');
}