// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyD1LRguv9N_gRI2kZFjdqNA5fvN8AqXyx4",
    authDomain: "mc2007-48ecf.firebaseapp.com",
    projectId: "mc2007-48ecf",
    storageBucket: "mc2007-48ecf.appspot.com",
    messagingSenderId: "636819382403",
    appId: "1:636819382403:web:e5465f37c94df79409bbb6",
    measurementId: "G-CZ57NENM1Z"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
let currentUser;

// Monitor authentication state and initialize listeners
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        initializeListeners(); // Initialize listeners only once when the user logs in
    } else {
        window.location.href = 'sign.html';
    }
});

// Show/hide loading spinner
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner').classList.toggle('hidden', !show);
}

function submitPost() {
    showLoadingSpinner(true);
    const postText = document.getElementById('postText').value;
    const postImage = document.getElementById('postImage').files[0];
    const postRef = db.ref('posts').push();
    const postId = postRef.key;

    const postData = {
        authorUID: currentUser.uid,
        text: postText,
        timestamp: Date.now(),
    };

    // Handle image upload (if present)
    if (postImage) {
        const storageRef = storage.ref(`posts/${postId}/${postImage.name}`);
        storageRef.put(postImage).then(() => {
            storageRef.getDownloadURL().then(url => {
                postData.imageURL = url;
                savePost(postId, postData);
            }).catch(error => {
                console.error("Error getting image URL:", error);
                showLoadingSpinner(false);
            });
        }).catch(error => {
            console.error("Error uploading image:", error);
            showLoadingSpinner(false);
        });
    } else {
        savePost(postId, postData);
    }
}

function initializeListeners() {
    db.ref('posts').off();
    db.ref('posts').orderByChild('timestamp').on('value', snapshot => {
        const postsArray = [];
        snapshot.forEach(childSnapshot => {
            postsArray.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });

        shuffleArray(postsArray);
        renderPosts(postsArray);
    });

    db.ref('posts').on('child_removed', snapshot => {
        const postDiv = document.querySelector(`.post[data-post-id="${snapshot.key}"]`);
        if (postDiv) postDiv.remove();
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function savePost(postId, postData) {
    db.ref(`posts/${postId}`).set(postData).then(() => {
        document.getElementById('postText').value = '';
        document.getElementById('postImage').value = '';
        showLoadingSpinner(false);
    }).catch(error => {
        console.error("Error saving post:", error);
        showLoadingSpinner(false);
    });
}





// Initialize listeners for loading posts with shuffling
function initializeListeners() {
    // Remove any existing listeners to avoid duplication
    db.ref('posts').off();

    // Fetch posts once, shuffle them, and render them
    db.ref('posts').orderByChild('timestamp').on('value', snapshot => {
        const postsArray = [];
        snapshot.forEach(childSnapshot => {
            postsArray.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });
        
        // Shuffle the posts array using the Fisher-Yates shuffle
        shuffleArray(postsArray);
        
        // Render shuffled posts
        renderPosts(postsArray);
    });

    // Listen for post removals
    db.ref('posts').on('child_removed', snapshot => {
        const postDiv = document.querySelector(`.post[data-post-id="${snapshot.key}"]`);
        if (postDiv) postDiv.remove();
    });
}

// Fisher-Yates shuffle algorithm to shuffle an array in-place
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// Render shuffled posts to the DOM
function renderPosts(postsArray) {
    const postList = document.getElementById('postList');
    postList.innerHTML = ''; // Clear existing posts

    // Render each post in the shuffled order
    postsArray.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = "post";
        postDiv.setAttribute('data-post-id', post.id);

        const postData = post.data;
        db.ref(`users/${postData.authorUID}`).once('value').then(userSnapshot => {
            const userData = userSnapshot.val();
            postDiv.innerHTML = `
                <div class="flex items-center mb-2">
                    <img src="${userData.profilePicture}" alt="${userData.name}" class="w-10 h-10 rounded-full mr-2">
                    <strong>${userData.name}</strong>
                    <span class="ml-2 text-sm text-gray-500">${new Date(postData.timestamp).toLocaleString()}</span>
                </div>
                <p>${postData.text || ''}</p>
                ${postData.imageURL ? `<img src="${postData.imageURL}" alt="Post Image" class="post-image"/>` : ''}
                <div class="post-actions">
                    ${postData.authorUID === currentUser.uid ? `
                        <button onclick="deletePost('${post.id}')" class="text-red-500">Delete</button>
                    ` : ''}
                    <button onclick="replyToPost('${post.id}')" class="text-blue-500">Reply</button>
                </div>
                <div class="replies mt-4"></div> <!-- Container for replies -->
            `;

            postList.appendChild(postDiv);
            loadReplies(post.id, postDiv.querySelector('.replies'));
        }).catch(error => console.error("Error fetching user info:", error));
    });
}


// Load replies for a given post and display them
function loadReplies(postId, repliesDiv) {
    // Clear any existing listeners for replies to prevent duplication
    db.ref(`posts/${postId}/replies`).off();

    // Attach a listener for replies to the specific post
    db.ref(`posts/${postId}/replies`).on('child_added', replySnapshot => {
        const replyData = replySnapshot.val();
        const replyId = replySnapshot.key;
        const replyDiv = document.createElement('div');
        replyDiv.className = "reply mb-2 p-2 border-t border-gray-300";

        // Fetch and display reply author's user data
        db.ref(`users/${replyData.authorUID}`).once('value').then(replyUserSnapshot => {
            const replyUserData = replyUserSnapshot.val();
            replyDiv.innerHTML = `
                <div class="flex items-center mb-1">
                    <img src="${replyUserData.profilePicture}" alt="${replyUserData.name}" class="w-8 h-8 rounded-full mr-2">
                    <strong>${replyUserData.name}</strong>
                    <span class="ml-2 text-xs text-gray-500">${new Date(replyData.timestamp).toLocaleString()}</span>
                </div>
                <p class="ml-10">${replyData.text}</p>
                ${replyData.authorUID === currentUser.uid ? `
                    <button onclick="deleteReply('${postId}', '${replyId}')" class="text-red-500 text-sm">Delete</button>
                ` : ''}
            `;
            repliesDiv.appendChild(replyDiv);
        }).catch(error => console.error("Error fetching reply user info:", error));
    });
}


function deletePost(postId) {
    // Retrieve the post data to check if the current user is the author
    db.ref(`posts/${postId}`).once('value').then(snapshot => {
        const postData = snapshot.val();
        if (postData.authorUID === currentUser.uid) {
            // Proceed with deleting the post if the current user is the author
            db.ref(`posts/${postId}`).remove().catch(error => {
                console.error("Error deleting post:", error);
            });
        } else {
            alert("You can only delete your own posts.");
        }
    }).catch(error => {
        console.error("Error fetching post data:", error);
    });
}


// Add a reply to a post
function replyToPost(postId) {
    const replyText = prompt("Enter your reply:");
    if (replyText) {
        const replyData = {
            text: replyText,
            authorUID: currentUser.uid,
            timestamp: Date.now()
        };
        db.ref(`posts/${postId}/replies`).push(replyData).catch(error => console.error("Error replying to post:", error));
    }
}

function deleteReply(postId, replyId) {
    // Retrieve the specific reply data
    db.ref(`posts/${postId}/replies/${replyId}`).once('value').then(snapshot => {
        const replyData = snapshot.val();
        if (replyData.authorUID === currentUser.uid) {
            // Proceed with deleting the reply if the current user is the author
            db.ref(`posts/${postId}/replies/${replyId}`).remove().catch(error => {
                console.error("Error deleting reply:", error);
            });
        } else {
            alert("You can only delete your own comments.");
        }
    }).catch(error => {
        console.error("Error fetching reply data:", error);
    });
}



// Modified initializeListeners to accept a filter parameter
function initializeListeners(filterByUser = false) {
    db.ref('posts').off();

    db.ref('posts').orderByChild('timestamp').on('value', snapshot => {
        const postsArray = [];
        snapshot.forEach(childSnapshot => {
            const postData = childSnapshot.val();
            const post = { id: childSnapshot.key, data: postData };

            // If filtering, only add posts by the current user or those commented by the user
            if (filterByUser) {
                if (postData.authorUID === currentUser.uid) {
                    postsArray.push(post);
                } else if (postData.replies) {
                    const userCommented = Object.values(postData.replies).some(reply => reply.authorUID === currentUser.uid);
                    if (userCommented) postsArray.push(post);
                }
            } else {
                postsArray.push(post);
            }
        });

        shuffleArray(postsArray);
        renderPosts(postsArray);
    });

    db.ref('posts').on('child_removed', snapshot => {
        const postDiv = document.querySelector(`.post[data-post-id="${snapshot.key}"]`);
        if (postDiv) postDiv.remove();
    });
}
