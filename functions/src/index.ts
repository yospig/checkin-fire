// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as functions from 'firebase-functions';
// The Firebase Admin SDK to access the Firebase Realtime Database.
import * as admin from 'firebase-admin';
admin.initializeApp();

// FireStoreの参照
const fs = admin.firestore();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

export const addMessage = functions.https.onRequest(async (req, res) => {
    // query param
    const msg = req.query.msg;
    // push message to uri
    const snapshot = await admin.database().ref("/messages").push({ original: msg });
    res.redirect(303, snapshot.ref.toString());
});

// makeUppercacse trigger is create data to `/messages/{pushId}/original`
export const makeUppercase = functions.database.ref('/messages/{pushId}/original').onCreate((snapshot, context) => {
    const original = snapshot.val();
    console.log('Uppercasing', context.params.pushId, original);
    const uppercase = original.toUpperCase();
    if (!snapshot.ref.parent) {
        throw new Error("snapshot.ref.parent is null. can't add uppercase");
    }
    return snapshot.ref.parent.child('uppercase').set(uppercase);
});

// addToFirestore
export const addToFirestore = functions.https.onRequest(async (req, res) => {
    // query param
//    const intimeString = req.query.in;
    const inDate: Date = new Date();
    await fs.collection('attendance').doc(inDate.toDateString()).set({
        year: inDate.getFullYear(),
        month: inDate.getMonth(),
        date: inDate.getDate()
    }).then((documentRef) => {
        res.send("add date: " + inDate.toString());
    });
});


export const fizzbuzz = functions.https.onRequest((request, response) => {
    // without type
    let fb = ""
    for (let i = 1; i <= 100; i++) {
        if (i % 3 === 0 && i % 5 === 0) {
            fb += "FizzBuzz";
        } else if (i % 3 === 0) {
            fb += "Fizz";
        } else if (i % 5 === 0) {
            fb += "Buzz";
        } else {
            fb += i
        }
        fb += " ";
    }
    response.send(fb);
    // use type
});

