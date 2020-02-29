// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as functions from 'firebase-functions';
// The Firebase Admin SDK to access the Firebase Realtime Database.
import * as admin from 'firebase-admin';
admin.initializeApp();

// FireStoreの参照
const fs = admin.firestore();
const settings = { timestampsInSnapshots: true };
fs.settings(settings);

const DEFAULT_USER: string = `yospig`;

// attendance Document
interface AttendanceDoc {
    year: number;
    month: number;
    day: number;
    timestamp: string;
}
// attendance_user/date Document
interface AttendanceUserDateDoc {
    in_time_str: string;
    in_hour: number;
    in_min: number;
    out_time_str: string;
    out_hour: number;
    out_min: number;
}
// attendance/user Document
interface AttendanceUserDocIn {
    in_time_str: string;
    in_hour: number;
    in_min: number;
    timestamp: string;
}
// attendance/user Document
interface AttendanceUserDocOut {
    out_time_str: string;
    out_hour: number;
    out_min: number;
    timestamp: string;
}

// CheckIn `/CheckIn?u=xxxxxx`
export const CheckIn = functions.https.onRequest(async (req, res) => {
    const now: any = admin.firestore.FieldValue.serverTimestamp();
    // FIX: it is UTC... need JST
    //      year, month, day, hour are wrong.
    const setDate: Date = new Date();
    const dateDoc: AttendanceDoc = {
        year: setDate.getFullYear(),
        month: setDate.getMonth() + 1,
        day: setDate.getDate(),
        timestamp: now
    }
    const inTime: AttendanceUserDocIn = {
        in_time_str: ('00' + setDate.getHours()).toString().slice(-2) + ':' + ('00' + setDate.getMinutes()).toString().slice(-2),
        in_hour: setDate.getHours(),
        in_min: setDate.getMinutes(),
        timestamp: now
    }
    // TODO: want to use formatter to doc name
    const dateDocName: string = setDate.getFullYear().toString() + ('00' + dateDoc.month).toString().slice(-2) + setDate.getDate().toString()
    const dateDocRef = fs.collection('attendance').doc(dateDocName);
    await dateDocRef.set(
        dateDoc,{merge:true}
    );
    // TODO: Should be separated
    const user: string = (req.query.u !== null) ? req.query.u : DEFAULT_USER;
    const dateUnderUserDocRef = dateDocRef.collection('user').doc(user);
    // merge指定しているのでoutTimeの値は上書きされない
    await dateUnderUserDocRef.set(
        inTime,{merge:true}
    ).then(() => {
        console.log("user: ", user, " , intime: ", setDate.toDateString());
        res.send("Add InTime Successful: " + setDate.toDateString());
    });
});

// CheckOut `/CheckOut?u=xxxxxx`
export const CheckOut = functions.https.onRequest(async (req, res) => {
    const now: any = admin.firestore.FieldValue.serverTimestamp();
    const setDate: Date = new Date();
    const dateDoc: AttendanceDoc = {
        year: setDate.getFullYear(),
        month: setDate.getMonth() + 1,
        day: setDate.getDate(),
        timestamp: now
    }
    const outTime: AttendanceUserDocOut = {
        out_time_str: ('00' + setDate.getHours()).toString().slice(-2) + ':' + ('00' + setDate.getMinutes()).toString().slice(-2),
        out_hour: setDate.getHours(),
        out_min: setDate.getMinutes(),
        timestamp: now
    }
    const dateDocName: string = setDate.getFullYear().toString() + ('00' + dateDoc.month).toString().slice(-2) + setDate.getDate().toString()
    const dateDocRef = fs.collection('attendance').doc(dateDocName);
    await dateDocRef.set(
        dateDoc,{merge:true}
    );
    // TODO: Should be separated
    const user: string = (req.query.u !== null) ? req.query.u : DEFAULT_USER;
    const dateUnderUserDocRef = dateDocRef.collection('user').doc(user);
    // merge指定しているのでinTimeの値は上書きされない
    await dateUnderUserDocRef.set(
        outTime,{merge:true}
    ).then(() => {
        console.log("user: ", user, " , intime: ", setDate.toDateString());
        res.send("Add OutTime Successful: " + setDate.toDateString());
    });
});

// fetchUserDate is a day for a one user `/fetchUserDate?u=xxxxxx&d=yyyymmdd`
export const fetchUserDate = functions.https.onRequest(async (req, res) => {
    // query param
    const paramDay: string = req.query.d;
    const paramUser: string = req.query.u;
    const user: string = (paramUser !== null) ? paramUser : DEFAULT_USER;
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

// fetchUsersForDate is a day for all users `/fetchUsersForDate?d=yyyymmdd`
export const fetchUsersForDate = functions.https.onRequest(async (req, res) => {
    // query param
    const paramDay: string = req.query.d;
    console.log(paramDay);
    await admin.firestore().collection('attendance').doc(paramDay).collection('user').get(
    ).then(
        function (querySnapshot) {
            const doc: {
                [date: string]: any;
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

// fetchDatesForUser is all days for a user `/fetchDatesForUser?u=xxxxxx`
export const fetchDatesForUser = functions.https.onRequest(async (req, res) => {
    // query param
    const paramUser: string = req.query.u;
    const user: string = (paramUser !== null) ? paramUser : DEFAULT_USER;
    await admin.firestore().collection('attendance_user').doc(user).collection('date').get(
        ).then(
            function (querySnapshot) {
                const doc: {
                    [user: string]: any;
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


// makeUserBaseInOut trigger is user base data
// TODO Should be divide onWrite to onCreate and onUpdate
export const makeUserBaseInOut = functions.firestore.document("/attendance/{dateId}/user/{userId}").onWrite(async (change, context) => {
    const after = change.after.data();
    const userBaseRef = fs.collection('attendance_user').doc(context.params.userId).collection('date').doc(context.params.dateId);
    if (after) {
        const dto: AttendanceUserDateDoc = {
            in_time_str: after.in_time_str !== undefined ? after.in_time_str : "",
            in_hour: after.in_hour !== undefined ? after.in_hour : 0,
            in_min: after.in_min !== undefined ? after.in_min : 0,
            out_time_str: after.out_time_str !== undefined ? after.out_time_str : "",
            out_hour: after.out_hour !== undefined ? after.out_hour : 0,
            out_min: after.out_min !== undefined ? after.out_min : 0
        };
        await userBaseRef.set(
            dto,{merge:true}
        );
    }
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

