// Primary JS for the site
// Using Bootstrap 5

// Firebase setup (no nodejs, just using compat)
// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());

var uiConfig = {
    callbacks: {
        signInSuccessWithAuthResult: function (authResult, redirectUrl) {
            // User successfully signed in.
            // Return type determines whether we continue the redirect automatically
            // or whether we leave that to developer to handle.
            return true;
        },
        uiShown: function () {
            // The widget is rendered.
            // Hide the loader.
            document.getElementById('loader').style.display = 'none';
        }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
    signInSuccessUrl: '/index.html',
    signInOptions: [
        // Use google and email providers
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    // Terms of service url.
    tosUrl: 'https://www.example.com',
    // Privacy policy url.
    privacyPolicyUrl: 'https://www.example.com'
};

// ------------ Main JS -------------

// The start method will wait until the DOM is loaded.
ui.start('#firebaseui-auth-container', uiConfig);

// Code to run after the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Login flow handler
    handleLoginState();
    initializeRecorder();
});

function postLogin(user) {
    // User is signed in.
    console.log("User is signed in");
    // hide #login and show #home
    document.getElementById('login').style.display = 'none';
    document.getElementById('home').style.display = 'block';
    // show #logoutButton
    document.getElementById('logoutButton').style.display = 'block';

    // Set #username-header to the user's name
    document.getElementById('username-header').innerHTML = user.displayName + "'s Mouthsounds";
    
    refreshMouthsounds();
}

// Functions
function handleLoginState() {
    // Check if the user is logged in
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            postLogin(user)
        } else {
            // No user is signed in.
            console.log('No user logged in');
            // hide #home and show #login
            document.getElementById('home').style.display = 'none';
            document.getElementById('login').style.display = 'block';
            // Hide #logoutButton
            document.getElementById('logoutButton').style.display = 'none';
        }
    });
}

function logout(){
    firebase.auth().signOut().then(() => {
        // Sign-out successful.
        console.log("User logged out");
    }).catch((error) => {
        // An error happened.
        console.log("Error logging out");
    });
}

// Show #uploadModal
var uploadModal
function showUploadModal() {
    uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
    uploadModal.show();
}

function uploadMouthsound(){
    // Get the title and description from the input
    var title = document.getElementById("uploadTitle").value;
    var description = document.getElementById("uploadDescription").value;
    // Make a unique file name based on the current date and time
    var date = new Date();
    var mouthsoundName = title + "-" + date.getTime() + ".ogg";
    // Get a file given the blob
    var audioBlob = blob;
    var file = new File([audioBlob], mouthsoundName, {
        type: "audio/ogg",
    });
    chunks = [];

    // Get the user's ID
    var uid = firebase.auth().currentUser.uid;
    // Create a reference to the file in the storage bucket
    // Files look like: "user/<UID>/path/to/file.txt"
    var mouthsoundRef = storageRef.child('user/' + uid + '/' + file.name);
    // Upload the file
    mouthsoundRef.put(file).then(function(snapshot) {
        // Once the file is uploaded, get the download URL
        mouthsoundRef.getDownloadURL().then(function(url) {
            // Get the user's ID
            var uid = firebase.auth().currentUser.uid;
            // Create a reference to the user's mouthsounds in firestore
            var mouthsoundsRef = db.collection("mouthsounds").doc(uid);
            // Create a new mouthsound in the collection
            mouthsoundsRef.set({
                [file.name]: {
                    title: title,
                    description: description,
                    url: url
                }
            }, { merge: true })

            // Close the #uploadModal and show the #uploadSuccessToast Toast
            var uploadSuccessToast = new bootstrap.Toast(document.getElementById('uploadSuccessToast'));
            uploadSuccessToast.show();
            uploadModal.hide();
            refreshMouthsounds();
            
            // after 500 ms, dispose of the uploadModal
            setTimeout(function(){
                uploadModal.dispose();
            }, 500);
        });
    });
}

// Populate the list of the user's mouthsounds
function refreshMouthsounds() {
    // Fill #my-mouthsounds with the user's mouthsounds using the #mouthsound-list-item template
    // Get the template
    var mouthsoundTemplate = document.getElementById("mouthsound-list-item");
    // Get the user's ID
    var uid = firebase.auth().currentUser.uid;
    // Create a reference to the user's mouthsounds in firestore
    var mouthsoundsRef = db.collection("mouthsounds").doc(uid);
    // Get the user's mouthsounds
    mouthsoundsRef.get().then((doc) => {
        if (doc.exists) {
            // Get the list of mouthsounds (is a map from filename to mouthsound)
            var mouthsounds = doc.data();
            // Get the mouthsound list element
            var mouthsoundList = document.getElementById("my-mouthsounds");
            // Clear the mouthsound list
            mouthsoundList.innerHTML = "";
            // For each mouthsound, add a row to the mouthsound list
            for (var mouthsoundName in mouthsounds) {
                // Get the mouthsound
                var mouthsound = mouthsounds[mouthsoundName];
                // Clone the template
                var mouthsoundRow = mouthsoundTemplate.content.cloneNode(true);
                // Set the mouthsound name
                mouthsoundRow.querySelector(".mouthsound-title").innerHTML = mouthsound.title;
                // Set the mouthsound audio source
                mouthsoundRow.querySelector("source").src = mouthsound.url;
                // Set the filename
                mouthsoundRow.querySelector(".mouthsound-filename").innerHTML = mouthsoundName;
                // Add the delete button listener
                mouthsoundRow.querySelector(".delete-button").addEventListener("click", function(){
                    // Confirm by updating the button text and having the user click again
                    if (this.innerHTML == "Delete") {
                        this.innerHTML = "Confirm";
                    } else {
                        // Get the user's ID
                        var uid = firebase.auth().currentUser.uid;
                        // Get the mouthsoundName
                        var mouthsoundName = this.parentElement.parentElement.querySelector(".mouthsound-filename").innerHTML;
                        // Create a reference to the user's mouthsounds in firestore
                        var mouthsoundsRef = db.collection("mouthsounds").doc(uid);
                        // Deletion struct
                        var deletePayload = {};
                        deletePayload[mouthsoundName] = firebase.firestore.FieldValue.delete();
                        // Delete the mouthsound
                        mouthsoundsRef.update(deletePayload).then(() => {
                            // Refresh the mouthsounds
                            refreshMouthsounds();
                        });
                    }
                });
                
                // Add the mouthsound row to the mouthsound list
                mouthsoundList.appendChild(mouthsoundRow);
            }
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });
}

var mediaRecorder
var chunks
var blob
function initializeRecorder() {
    // Use MedaiRecorder API to record audio
    navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(function (stream) {
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];
        
        mediaRecorder.onstop = function (e) {
        console.log("data available after MediaRecorder.stop() called.");
        blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
        chunks = [];
        var audioURL = window.URL.createObjectURL(blob);
        document.getElementById("audio-data").src = audioURL;
        };
        mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data);
        };
    })
    .catch(function (err) {
        console.log("The following error occured: " + err);
    });
}

function startRecording() {
    chunks = [];
    mediaRecorder.start();
    console.log(mediaRecorder.state);
    console.log("recorder started");
    document.getElementById(
        "uploadAudioRecordButton"
    ).disabled = true;
    document.getElementById(
        "uploadAudioStopButton"
    ).disabled = false;
}

function stopRecording() {
    mediaRecorder.stop();
    console.log(mediaRecorder.state);
    console.log("recorder stopped");
    document.getElementById(
        "uploadAudioStopButton"
    ).disabled = true;
    document.getElementById(
        "uploadAudioRecordButton"
    ).disabled = false;
    document.getElementById(
        "uploadAudioUploadButton"
    ).disabled = false;
}