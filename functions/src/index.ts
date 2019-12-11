// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as functions from 'firebase-functions';
// The Firebase Admin SDK to access the Firebase Realtime Database.
import * as admin from 'firebase-admin';
admin.initializeApp();

// FireStoreの参照
const fs = admin.firestore();
const settings = { timestampsInSnapshots: true };
fs.settings(settings);

const defaultUser: string = `yospig`;

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

// CheckInTime
export const CheckInTime = functions.https.onRequest(async (req, res) => {
    const now: any = admin.firestore.FieldValue.serverTimestamp();
    // FIX: it is UTC... need JST
    //      year, month, day, hour are wrong.
    const setDate: Date = new Date();
    const currentMonth: number = setDate.getMonth() + 1;
    // TODO: want to use formatter to doc name
    const dateDocName: string = setDate.getFullYear().toString() + currentMonth.toString() + setDate.getDate().toString()
    const dateDocRef = fs.collection('attendance').doc(dateDocName);
    await dateDocRef.set({
        year: setDate.getFullYear(),
        month: currentMonth,
        day: setDate.getDate(),
        timestamp: now
    });
    // TODO: Should be separated
    const user: string = (req.query.user !== null) ? req.query.user : defaultUser;
    const dateUnderUserDocRef = dateDocRef.collection('user').doc(user);
    // merge指定なしの場合とupdateはintimeで値が入っていてもdocumentすべて上書きになる
    await dateUnderUserDocRef.set({
        in_time_str: setDate.getHours().toString() + ':' + setDate.getMinutes().toString(),
        in_time: {
            in_hour: setDate.getHours(),
            in_min: setDate.getMinutes()
        },
        timestamp: now
    }).then(() => {
        console.log("user: ", user, " , intime: ", setDate.toDateString());
        res.send("Add InTime Successful: " + setDate.toDateString());
    });
});

// CheckOutTime
export const CheckOutTime = functions.https.onRequest(async (req, res) => {
    const now: any = admin.firestore.FieldValue.serverTimestamp();
    const setDate: Date = new Date();
    const dateDoc = {
        year: setDate.getFullYear(),
        month: setDate.getMonth() + 1,
        day: setDate.getDate(),
        timestamp: now
    }
    const outTime = {
        out_time_str: setDate.getHours().toString() + ':' + setDate.getMinutes().toString(),
        out_time: {
            out_hour: setDate.getHours(),
            out_min: setDate.getMinutes()
        },
        timestamp: now
    }
    const dateDocName: string = dateDoc.year.toString() + dateDoc.month.toString() + dateDoc.day.toString()
    const dateDocRef = fs.collection('attendance').doc(dateDocName);
    await dateDocRef.set(
        dateDoc,{merge:true}
    );
    // TODO: Should be separated
    const user: string = (req.query.user !== null) ? req.query.user : defaultUser;
    const dateUnderUserDocRef = dateDocRef.collection('user').doc(user);
    // merge指定しているのでinTimeの値は上書きされない
    await dateUnderUserDocRef.set(
        outTime,{merge:true}
    ).then(() => {
        console.log("user: ", user, " , intime: ", setDate.toDateString());
        res.send("Add OutTime Successful: " + setDate.toDateString());
    });
});

// fetchUserDoc is a day for a one user
export const fetchUserDoc = functions.https.onRequest(async (req, res) => {
    // query param
    const paramDay: string = req.query.d;
    const paramUser: string = req.query.u;
    const user: string = (paramUser != null) ? paramUser : defaultUser;
    console.log(paramDay, user);
    await admin.firestore().collection('attendance').doc(paramDay).collection('user').doc(user).get(
    ).then(resDoc => {
        if (resDoc.exists) {
            res.send(resDoc.data());
        } else {
            res.status(404).send("document is not exist");
        }
    });
});

// fetchUsersDocs is a day for all users
export const fetchUsersDocs = functions.https.onRequest(async (req, res) => {
    // query param
    const paramDay: string = req.query.d;
    console.log(paramDay);
    await admin.firestore().collection('attendance').doc(paramDay).collection('user').get(
    ).then(
        function (querySnapshot) {
            let doc: {
                [key: string]: any;
            } = {}
            querySnapshot.forEach(function (resDoc) {
                console.log(resDoc.id, " => ", resDoc.data());
                doc[resDoc.id] = resDoc.data();
            });
            res.send(doc);
        }
    ).catch((error) => {
        res.status(500).send("can't fetch docs");
    });
});


// fizzbuzz is test function
export const fizzbuzz = functions.https.onRequest((request, response) => {
    const fb: Array<string | number> = [];
    for (let i = 1; i <= 100; i++) {
        if (i % 3 === 0 && i % 5 === 0) {
            fb.push("FizzBuzz")
        } else if (i % 3 === 0) {
            fb.push("Fizz")
        } else if (i % 5 === 0) {
            fb.push("Buzz")
        } else {
            fb.push(i)
        }
    }
    response.send(fb);
});

