import {StartVRApp} from "./vrapp";

let user = firebase.auth().currentUser;
let provider = new firebase.auth.GoogleAuthProvider();
if (user == undefined) {
    firebase.auth()
        .signInWithPopup(provider)
        .then((result) => {
            /** @type {firebase.auth.OAuthCredential} */
            let credential = result.credential;
            let token = credential.accessToken;
            let user = result.user;

            document.querySelector("#login-message").remove();
            StartVRApp();
        }).catch((error) => {
            let error_message = document.createElement("p");
            error_message.innerText = `${error}`;
            document.querySelector("body").appendChild(error_message);
        });
} else {
    res(user);
}
