// --- savedata.js ---

/**
 * Firebase Realtime Database reference.
 * Assumes Firebase is initialized in main.js or elsewhere
 * and 'database' is globally available.
 */
let db;
try {
    // Ensure Firebase app is initialized and database service exists
    if (typeof firebase !== 'undefined' && firebase.database) {
        db = firebase.database();
        console.log("savedata.js: Firebase Database reference acquired.");
    } else {
        console.error("savedata.js: Firebase Database SDK not initialized or available.");
        // You might want to prevent further logging attempts here
    }
} catch (error) {
    console.error("savedata.js: Error accessing Firebase database.", error);
}


/**
 * Logs the state *after* a delivery attempt (including Wide/NB outcomes).
 * Gathers most data from global state variables defined in main.js.
 *
 * @param {string|number} outcome - The primary result ('W', 'D', 1, 2, 3, 4, 6).
 * @param {number} runsScoredThisAction - Runs associated specifically with THIS action
 *                 (runs off bat, runs during wide/nb, 0 for dot/wicket signal).
 * @param {boolean} wasWide - Was the delivery signal Wide?
 * @param {boolean} wasNoBall - Was the delivery signal No Ball?
 * @returns {string|null} The Firebase key of the saved delivery record, or null on error/if no save. Needed for potential wicket updates.
 */
function logDeliveryAttempt(outcome, runsScoredThisAction, wasWide, wasNoBall) {
    // ... (checks for db, matchId, globals) ...
    if (!db) { console.error("Firebase DB not available..."); return null; }
    if (typeof matchId === 'undefined' || !matchId) { console.error("Cannot log delivery: Global 'matchId' is not set..."); return null; }
    // ... (other global variable checks if needed) ...

    // --- Gather data from global state ---
    const currentMatchId = matchId;
    const currentOver = over_no;
    const currentBall = ball_no;
    const currentStriker = strikerName || "Unknown Striker";
    const currentNonStriker = nonStrikerName || "Unknown NonStriker";
    const currentBowlerName = currentBowler || "Unknown Bowler";
    const currentBattingTeam = battingTeam || "Unknown Batting";
    const currentBowlingTeam = bowlingTeam || "Unknown Bowling";
    const currentInningsSerial = inningsDeliveryCounter;

    let deliveryData = {
        matchId: currentMatchId,
        deliveryInningsSerial: currentInningsSerial, 
        date: $("#matchDate").val() || new Date().toISOString().split('T')[0],
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        localTimestamp: new Date().toISOString(),
        over: currentOver,
        ball: currentBall,
        battingTeam: currentBattingTeam,
        bowlingTeam: currentBowlingTeam,
        striker: currentStriker,
        nonStriker: currentNonStriker,
        bowler: currentBowlerName,
        runsOffBat: 0, // Default, calculated below
        isWide: wasWide,
        isNoBall: wasNoBall,
        extrasRuns: 0, // Default, calculated below
        extrasType: null, // Default, calculated below
        isWicket: (outcome === 'W'),
        wicketType: null,
        playerDismissed: null
    };

    // --- Calculate specific fields based on outcome ---
    if (wasWide) {
        deliveryData.extrasType = 'Wide';
        // <<< ISSUE 1 FIX >>>
        deliveryData.extrasRuns = 1; // Set extrasRuns to 1 for the Wide itself
        deliveryData.runsOffBat = runsScoredThisAction; // Log runs scored during the Wide here
    } else if (wasNoBall) {
        deliveryData.extrasType = 'NoBall';
        // <<< ISSUE 1 FIX >>>
        deliveryData.extrasRuns = 1; // Set extrasRuns to 1 for the No Ball itself
        deliveryData.runsOffBat = runsScoredThisAction; // Log runs scored *off bat* during the No Ball here
    } else { // Legal Delivery
        deliveryData.runsOffBat = runsScoredThisAction;
        deliveryData.extrasRuns = 0; // No extras cost for legal delivery
        deliveryData.extrasType = null;
    }

    // --- Save to Firebase ---
    const deliveryRef = db.ref(`/matchDeliveries/${currentMatchId}`);
    const newDelivery = deliveryRef.push();
    const deliveryKey = newDelivery.key;

    console.log(`Firebase <= Delivery (${currentOver}.${currentBall}):`, JSON.stringify(deliveryData)); // Log before saving

    newDelivery.set(deliveryData)
        .then(() => { /* console.log(...) */ }) // Shortened success log
        .catch((error) => { console.error(`Firebase: Error logging delivery (${currentOver}.${currentBall}):`, error); });

    return deliveryKey;
} // --- End of logDeliveryAttempt ---


/**
 * Logs Byes or LegByes (which are legal deliveries).
 * Gathers most data from global state.
 *
 * @param {string} type - 'byes' or 'leg_byes'.
 * @param {number} runsScored - Runs scored as byes/legbyes (0 to 6).
 */
function logExtrasDelivery(type, runsScored) {
     if (!db) {
        console.error("Firebase DB not available. Cannot log extras delivery.");
        return;
    }
    if (!matchId) {
        console.warn("Cannot log extras delivery: matchId is not set.");
        return;
    }

    // --- Gather data from global state ---
    const currentMatchId = matchId;
    const currentOver = over_no;
    const currentBall = ball_no; // Ball number before it increments in main.js
    const currentStriker = strikerName; // Before potential swap
    const currentNonStriker = nonStrikerName; // Before potential swap
    const currentBowlerName = currentBowler;
    const currentBattingTeam = battingTeam;
    const currentBowlingTeam = bowlingTeam;
    const currentInningsSerial = inningsDeliveryCounter;    
    const outcomeSymbol = `${type.charAt(0).toUpperCase()}${runsScored}`; // B0, LB4 etc.

    let deliveryData = {
        matchId: currentMatchId,
        deliveryInningsSerial: currentInningsSerial,
        date: $("#matchDate").val(),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        localTimestamp: new Date().toISOString(),
        over: currentOver,
        ball: currentBall, // Log the ball number for which this occurred
        battingTeam: currentBattingTeam,
        bowlingTeam: currentBowlingTeam,
        striker: currentStriker,
        nonStriker: currentNonStriker,
        bowler: currentBowlerName,
        runsOffBat: 0, // Byes/LegByes are not off the bat
        isWide: false,
        isNoBall: false,
        extrasRuns: runsScored, // Runs scored as B/LB are the 'extras' for this type
        extrasType: (type === 'byes' ? 'Bye' : 'LegBye'),
        isWicket: false,
        wicketType: null,
        playerDismissed: null,
        outcomeSymbol: outcomeSymbol // Store the display symbol like B4, LB1
    };

    // --- Save to Firebase ---
    const deliveryRef = db.ref(`/matchDeliveries/${currentMatchId}`);
    deliveryRef.push(deliveryData) // Use push for unique ID
        .then(() => {
            console.log(`Firebase: Extras Delivery logged (${currentOver}.${currentBall})`);
        })
        .catch((error) => {
            console.error(`Firebase: Error logging extras delivery (${currentOver}.${currentBall}):`, error);
        });

    // No key needed to return as wickets aren't involved here.
}


/**
 * Updates an existing delivery record in Firebase with wicket details.
 *
 * @param {string} deliveryKey - The unique key of the delivery record to update.
 * @param {string} wicketType - The type of dismissal (e.g., 'Bowled').
 * @param {string} playerDismissed - The name of the dismissed player.
 */
function updateWicketDetails(deliveryKey, wicketType, playerDismissed) {
    if (!db) {
        console.error("Firebase DB not available. Cannot update wicket details.");
        return;
    }
     if (!matchId) {
        console.warn("Cannot update wicket: matchId is not set.");
        return;
    }
    if (!deliveryKey) {
        console.error("Cannot update wicket: Invalid deliveryKey provided.");
        return;
    }

    const updateData = {
        wicketType: wicketType,
        playerDismissed: playerDismissed,
        // isWicket should already be true if this is called correctly
    };

    const deliveryUpdateRef = db.ref(`/matchDeliveries/${matchId}/${deliveryKey}`);

    deliveryUpdateRef.update(updateData)
        .then(() => {
            console.log(`Firebase: Wicket details updated for Key: ${deliveryKey}`);
        })
        .catch((error) => {
            console.error(`Firebase: Error updating wicket details for Key ${deliveryKey}:`, error);
        });
}

console.log("savedata.js loaded and ready."); // Confirmation