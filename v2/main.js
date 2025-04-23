// --- START OF FILE main.js ---

// --- Global State Variables ---
var scoreboard = [[], [0]]; // scoreboard[<over_no>][0] counts Wide/NB extra runs
var ball_no = 1;
var over_no = 1;
var runs = 0;
var totalWickets = 0;
var edited = []; // For tracking manual edits (optional)
var isNoBall = false; // State for pending No Ball outcome
var isWideBall = false; // State for pending Wide outcome
var isInExtrasMode = false; // Flag for simple Bye/Leg Bye mode
var isInningsOver = false;
var currentInnings = 1;
var maxOvers = 20; // Default, can be set by user
var runs_off_the_bat = 0; // Tracks runs scored directly off the bat for logging

// Team and Player Info
let battingTeam = "";
let bowlingTeam = "";
let strikerName = "";
let nonStrikerName = "";
let currentBowler = "";
let playerOut = ""; // Tracks which batsman ('striker' or 'nonStriker') is selected in the Wicket UI
let pendingWicketDeliveryKey = null; // Stores the Firebase key for update
let inningsDeliveryCounter = 1;


// Match and Mode Info
let matchId = "";
var isTargetMode = false;
var targetRuns = -1;
var targetOvers = -1;
var isShareMode = false; // Placeholder for sharing feature

// --- Utility Functions ---

function updateHtml(eleId, newHtml) {
    const element = $(eleId);
    if (element.length === 0) {
        // console.warn(`updateHtml: Element with ID '${eleId}' not found.`);
        return;
    }
    let isSame = element.html() == newHtml; // Simple check
    element.html(newHtml);
    // ... (sharing placeholder) ...
}

function generateMatchId() {
    const team1 = $("#team1").val().trim().replace(/\s+/g, '');
    const team2 = $("#team2").val().trim().replace(/\s+/g, '');
    const date = $("#matchDate").val();

    if (!team1 || !team2 || !date) {
        alert("Please enter both team names and select a match date.");
        return null;
    }
    matchId = `${date}_${team1}_v_${team2}`;
    console.log("Generated matchId:", matchId);
    return matchId;
}

function swapStrikerNonStriker() {
    console.log(`Swapping Strike: ${strikerName} <-> ${nonStrikerName}`);
    let temp = strikerName;
    strikerName = nonStrikerName;
    nonStrikerName = temp;
    updateBatsmanDisplay();
}

function autoSwapBatsmanOnSingleOrTriple(runValue) {
    // Use modulo for cleaner odd check
    if (typeof runValue === 'number' && runValue % 2 === 1) {
        swapStrikerNonStriker();
    }
}


// --- UI Update Functions ---

function updateBatsmanDisplay() {
    updateHtml("#strikerNameDisplay", `Striker: ${strikerName || 'N/A'}`);
    updateHtml("#nonStrikerNameDisplay", `Non-Striker: ${nonStrikerName || 'N/A'}`);
    updateHtml("#currentBowlerDisplay", `Bowler: ${currentBowler || 'N/A'}`);
}

function updateBattingTeamDisplay() {
    const teamName = battingTeam || "Select Teams";
    console.log("✅ Updating team display to:", teamName);
    updateHtml("#battingTeam", teamName);
}

function update_score() {
    let calculatedScore = 0;
    let calculatedWickets = 0;

    for (let i = 1; i < scoreboard.length; i++) {
        if (!scoreboard[i]) continue;
        calculatedScore += scoreboard[i][0] || 0; // Add extras from slot 0
        for (let j = 1; j < scoreboard[i].length; j++) {
            const ball = scoreboard[i][j];
            if (ball === undefined || ball === null) continue;

            if (typeof ball === 'number') {
                calculatedScore += ball;
            } else if (typeof ball === 'string') {
                if (ball === 'W') {
                    calculatedWickets++;
                } else if (ball.startsWith('B') || ball.startsWith('L')) { // Handle Byes/Leg Byes recorded
                    const byeRuns = parseInt(ball.substring(1), 10);
                    if (!isNaN(byeRuns)) {
                        calculatedScore += byeRuns;
                    }
                }
                // Dot 'D' adds nothing
            }
        }
    }

    runs = calculatedScore;
    totalWickets = calculatedWickets;

    updateHtml("#run", runs);
    updateHtml("#wickets", totalWickets);
    updateTarget();
    console.log(`Score Updated: ${runs}/${totalWickets}`);
}

function update_scoreboard() {
    var tableContent = "<tr><th>Over</th><th>Score (Extras)</th></tr>";
    for (let i = 1; i < scoreboard.length; i++) {
        if (!scoreboard[i]) continue;
        tableContent += `<tr><td>${i}</td>`;
        let ballsDisplay = scoreboard[i].slice(1).map(b => (b === undefined || b === null) ? '_' : b).join(' ');
        let extras = scoreboard[i][0] || 0;
        tableContent += `<td>${ballsDisplay} (${extras})</td></tr>`;
    }
    updateHtml("#scoreboard", tableContent);
}

function update_runboard() {
    if (!scoreboard[over_no]) { scoreboard[over_no] = [0]; }

    for (let i = 1; i <= 6; i++) {
        let score_val = scoreboard[over_no][i];
        let display_val = (score_val === undefined || score_val === null) ? "" : score_val;
        updateHtml("#ball_no_" + i.toString(), display_val);

        $("#ball_no_" + i.toString()).removeClass("btn-primary btn-danger btn-secondary").addClass("btn-light"); // Reset styles

        if (score_val === 'W') {
            $("#ball_no_" + i.toString()).removeClass("btn-light").addClass("btn-danger");
        } else if (score_val === 'D' || score_val === 'B0' || score_val === 'L0') { // Style dots and 0-run byes/legbyes
             $("#ball_no_" + i.toString()).removeClass("btn-light").addClass("btn-secondary");
        }
        // Add other styling if needed for B1, L4 etc.
    }

    // Highlight next ball if no illegal ball state is active AND not in extras mode
    if (!isNoBall && !isWideBall && !isInExtrasMode && ball_no <= 6) {
        $("#ball_no_" + ball_no.toString()).removeClass("btn-light").addClass("btn-primary");
    }

    let balls_this_over = ball_no - 1;
    if (balls_this_over < 0) balls_this_over = 0;
    if (balls_this_over > 6) balls_this_over = 6; // Should not exceed 6 displayed
    let overs_completed = over_no - 1;
    updateHtml("#over-ball", `${overs_completed}.${balls_this_over}`);
}


// --- State Management Functions ---

function noBall(is_NoBall) {
    isNoBall = is_NoBall;
    if (is_NoBall) {
        $("#no-ball-warning").show();
        $("#run_wide, #run_no_ball, #run_extras").prop("disabled", true); // Disable conflicting actions
        $("#run_no_ball").addClass('btn-danger text-white').removeClass('btn-outline-primary');
    } else {
        $("#no-ball-warning").hide();
         $("#run_wide, #run_no_ball, #run_extras").prop("disabled", false); // Re-enable if not in other modes
        $("#run_no_ball").removeClass('btn-danger text-white').addClass('btn-outline-primary');
    }
    update_runboard();
}

function wideBall(is_WideBall) {
    isWideBall = is_WideBall;
    if (is_WideBall) {
        $("#wide-ball-warning").show();
        $("#run_wide, #run_no_ball, #run_extras").prop("disabled", true); // Disable conflicting actions
        $("#run_wide").addClass('btn-danger text-white').removeClass('btn-outline-primary');
    } else {
        $("#wide-ball-warning").hide();
        $("#run_wide, #run_no_ball, #run_extras").prop("disabled", false); // Re-enable if not in other modes
        $("#run_wide").removeClass('btn-danger text-white').addClass('btn-outline-primary');
    }
    update_runboard();
}

// --- Simplified Extras Mode Control ---

// Enters the simplified "Expecting Extras Runs" state
function startExtrasMode() {
    // Prevent starting if already in another special state or innings over
    if (isNoBall || isWideBall || isInExtrasMode || isInningsOver) return;

    isInExtrasMode = true;
    console.log("Starting Extras Mode: Waiting for run input (0-6).");

    // Update UI to inform user
    $("#extras-mode-warning").text(`Extras Mode: Enter runs for Bye/Leg Bye (0-6). Press Dot, 1-6.`).show();
    $("#run_extras").addClass('btn-warning').removeClass('btn-outline-primary'); // Visually indicate active state

    // Disable conflicting actions WHILE in this mode
    $("#run_wide, #run_no_ball, #run_W, #run_extras").prop("disabled", true);
    update_runboard(); // Remove highlight from next ball indicator
}

// Exits the simplified "Expecting Extras Runs" state (Called by play_ball)
function cancelExtrasMode() {
    console.log("Auto-Cancelling Extras Mode after input.");
    isInExtrasMode = false;

    // Update UI
    $("#extras-mode-warning").hide();
    $("#run_extras").removeClass('btn-warning').addClass('btn-outline-primary'); // Revert button style

    // Re-enable conflicting actions (respecting innings state)
    if (!isInningsOver) {
        $("#run_wide, #run_no_ball, #run_W, #run_extras").prop("disabled", false);
    }
    update_runboard(); // Re-highlight next ball if appropriate
}

// --- Wicket Modal Interaction Functions ---

function selectBatsmanOut(player) {
  playerOut = player;
  $("#newBatsmanSection").show();
  $("#newBatsmanInput").focus();
  $("#strikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary").text(strikerName || 'Striker?');
  $("#nonStrikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary").text(nonStrikerName || 'Non-Striker?');
  if (player === "striker") {
    $("#strikerOutBtn").removeClass("btn-outline-primary").addClass("btn-danger").text(`OUT: ${strikerName || 'Striker?'}`);
  } else {
    $("#nonStrikerOutBtn").removeClass("btn-outline-primary").addClass("btn-danger").text(`OUT: ${nonStrikerName || 'Non-Striker?'}`);
  }
}

function showWicketUI() {
    $("#strikerOutBtn").text(strikerName || "Striker?");
    $("#nonStrikerOutBtn").text(nonStrikerName || "Non-Striker?");
    playerOut = "";
    $("#strikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary");
    $("#nonStrikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary");
    $("#newBatsmanSection").hide();
    $("#newBatsmanInput").val("");
    $("#wicketTypeSelect").prop('selectedIndex', 0);
    $("#wicketInputs").show();
    // hideExtrasInputs(); // No longer needed
}

function confirmWicket() {
    const wicketType = $("#wicketTypeSelect").val();
    const newBatsman = $("#newBatsmanInput").val().trim();
    let outPlayerName = "Unknown"; // Default

    if (!playerOut) { alert("Please select which batsman is out."); return; }
    outPlayerName = (playerOut === "striker") ? strikerName : nonStrikerName; // Assign here

    if (totalWickets >= 9 && !newBatsman) { console.log("Confirming 10th wicket."); }
    else if (!newBatsman) { alert("Please enter the new batsman's name."); return; }


    if (newBatsman) {
        if (playerOut === "striker") strikerName = newBatsman; else nonStrikerName = newBatsman;
        alert(`${outPlayerName} is out (${wicketType}). New batsman: ${newBatsman}`);
    } else {
        alert(`${outPlayerName} is out (${wicketType}). All out!`);
        if (playerOut === "striker") strikerName = "N/A (All Out)"; else nonStrikerName = "N/A (All Out)";
    }

    updateBatsmanDisplay();
    $("#wicketInputs").hide();

    // --- Firebase Wicket Update Call ---
    console.log(`CONFIRM WICKET Prep: Key=${pendingWicketDeliveryKey}, Type=${wicketType}, Player=${outPlayerName}`); // Combined log
    if (pendingWicketDeliveryKey && typeof updateWicketDetails === "function") {
        updateWicketDetails(pendingWicketDeliveryKey, wicketType, outPlayerName);
    } else {
        console.warn(`Could not update wicket details in Firebase. Key: ${pendingWicketDeliveryKey}, Function Found: ${typeof updateWicketDetails === "function"}`);
    }
    pendingWicketDeliveryKey = null; // Clear the key

    // Update score/runboard & check innings AFTER modal confirm
    update_score(); // This recalculates totalWickets based on scoreboard 'W' entries
    update_runboard();
    checkEndOfInnings();
    playerOut = ""; // Reset selection
}


// --- Main Game Logic ---

function play_ball(run) {
    // <<<--- Check for EXTRAS MODE First ---<<<
    if (isInExtrasMode) {
        console.log(`Handling Extras Mode Input: Runs Button=${run}`);
        let extrasRunsScored = 0;
        if (run === 'D') {
            extrasRunsScored = 0;
        } else if ([1, 2, 3, 4, 5, 6].includes(run)) {
            extrasRunsScored = run;
        } else {
            // Ignore invalid clicks like Wide/NB/Wicket/Extras while in this mode
            console.log("Invalid input during Extras Mode. Ignoring. Click Dot or 1-6.");
            return; // Exit without processing or cancelling mode
        }

        // Defaulting to 'Bye' for logging simplicity
        const extrasType = 'Bye';
        const outcomeSymbol = `B${extrasRunsScored}`;

        // 1. Update Score (Byes/LegByes add directly to score)
        runs += extrasRunsScored;

        // 2. Log to Console (Local)
        console.log(`Ball ${over_no}.${ball_no}: Delivery Outcome=${outcomeSymbol} (as Extra), Runs off bat = 0`);

        // 3. Log to Firebase (using simplified logExtrasDelivery)
        if (typeof logExtrasDelivery === "function") {
            logExtrasDelivery(extrasRunsScored); // Pass only runs
            inningsDeliveryCounter++; // Increment counter AFTER logging attempt
        } else {
            console.warn("logExtrasDelivery function not found.");
        }

        // 4. Update Scoreboard Array (Local)
        if (!scoreboard[over_no]) scoreboard[over_no] = [0];
        scoreboard[over_no][ball_no] = outcomeSymbol; // Record B0, B4 etc.

        // 5. Update Runboard Visual
        update_runboard(); // Before incrementing ball_no

        // 6. Advance Ball Count (It's a legal delivery)
        console.log(`Extras Mode: About to increment ball_no from ${ball_no}`);
        ball_no++;

        // 7. Handle Strike Rotation
        if (extrasRunsScored % 2 === 1) { // Use modulo for odd check
            swapStrikerNonStriker();
        }

        // 8. Check for End of Over
        if (ball_no >= 7) {
            ball_no = 1;
            over_no++;
            if (!scoreboard[over_no]) scoreboard[over_no] = [0];
            currentBowler = prompt(`Enter bowler for Over ${over_no}:`, currentBowler || "");
            if (!currentBowler) currentBowler = "Unknown";
            swapStrikerNonStriker(); // End of over swap
            updateBatsmanDisplay();
        }

        // 9. Update Score/UI Displays (runs already updated)
        update_score(); // Recalculate totals and update display
        update_scoreboard();
        updateBatsmanDisplay(); // If swap occurred
        update_runboard(); // Highlight next ball

        // 10. RESET Extras Mode State (Crucial!)
        cancelExtrasMode(); // Exit Extras mode automatically

        // 11. Check Innings End
        checkEndOfInnings();

        return; // Exit play_ball, the extras delivery is fully handled
    }
    // <<<--- End of EXTRAS MODE Check ---<<<

    // --- If not in Extras mode, proceed with normal play_ball logic ---
    runs_off_the_bat = 0; // Reset for normal calculation
    let deliveryOutcomeDescription = "";
    let logBallNo = ball_no;
    let logOverNo = over_no;
    let needsSwapAfterLog = false; // Remember if we need to swap batsmen later

    if (isInningsOver) { alert("Innings is already over!"); return; }
    if (!scoreboard[over_no]) { scoreboard[over_no] = [0]; }

    // --- Handle Wide/No Ball SIGNALS First ---
    if (run === "+") { // WIDE Signal
        wideBall(true);
        runs++;
        scoreboard[over_no][0]++;
        update_score();
        return; // Wait for next click
    }
    if (run === "NB") { // NO BALL Signal
        noBall(true);
        runs++;
        scoreboard[over_no][0]++;
        update_score();
        return; // Wait for next click
    }

    // --- Process the Outcome of a Delivery (Wide/NB Follow-up or Legal) ---
    let isThisDeliveryWide = isWideBall;
    let isThisDeliveryNoBall = isNoBall;
    let clickedRuns = 0;
    let outcomeBaseDescription = "";
    let isLegalDelivery = false; // Will be true ONLY for legal deliveries

    // Determine outcome of this click
    if (run === "W") { clickedRuns = 0; outcomeBaseDescription = "Wicket"; runs_off_the_bat = 0; }
    else if (run === "D") { clickedRuns = 0; outcomeBaseDescription = "0"; runs_off_the_bat = 0; }
    else if ([1, 2, 3, 4, 5, 6].includes(run)) { clickedRuns = run; outcomeBaseDescription = `${run}`; runs_off_the_bat = run; }
    else { console.error("Invalid run value received:", run); return; }

    // --- Apply Consequences based on delivery type ---
    if (isThisDeliveryWide) {
        deliveryOutcomeDescription = `Wide + ${outcomeBaseDescription}`;
        runs_off_the_bat = clickedRuns; // For logging consistency, record runs during wide here
        runs += clickedRuns; // Add runs scored *during* wide
        scoreboard[over_no][0] += clickedRuns; // These runs are also extras
        if (run === "W") { showWicketUI(); totalWickets++; }
        else if (clickedRuns % 2 === 1) { needsSwapAfterLog = true; } // Use modulo
        wideBall(false); isLegalDelivery = false; // Not a legal ball
    } else if (isThisDeliveryNoBall) {
        deliveryOutcomeDescription = `No Ball + ${outcomeBaseDescription}`;
        // runs_off_the_bat is correct from above (runs scored off bat during NB)
        runs += runs_off_the_bat; // Add runs off bat during NB
        scoreboard[over_no][0] += runs_off_the_bat; // These runs are also extras
        if (run === "W") { showWicketUI(); totalWickets++; }
        else if (runs_off_the_bat % 2 === 1) { needsSwapAfterLog = true; } // Use modulo
        noBall(false); isLegalDelivery = false; // Not a legal ball
    } else { // --- LEGAL Delivery ---
        deliveryOutcomeDescription = outcomeBaseDescription;
        isLegalDelivery = true; // Counts as a ball bowled
        // runs_off_the_bat is correct from above
        runs += runs_off_the_bat; // Add runs off bat to total
        if (run === "W") {
            showWicketUI(); totalWickets++;
            if (!scoreboard[over_no]) scoreboard[over_no] = [0];
            scoreboard[over_no][ball_no] = 'W'; // Record W for legal ball wicket
        } else {
            if (!scoreboard[over_no]) scoreboard[over_no] = [0];
            scoreboard[over_no][ball_no] = (run === "D") ? 'D' : runs_off_the_bat; // Record D or runs
            if (runs_off_the_bat % 2 === 1) { needsSwapAfterLog = true; } // Flag for swap instead of calling autoSwap... // <<<--- CHANGE MADE HERE
        }
    }

    // --- Centralized Logging & Firebase Call (for Wide/NB/Legal) ---
    console.log(`Ball ${logOverNo}.${logBallNo}: Outcome=${deliveryOutcomeDescription}, RunsOffBat=${runs_off_the_bat}`);
    pendingWicketDeliveryKey = null;
    if (typeof logDeliveryAttempt === "function") {
        const deliveryKey = logDeliveryAttempt( run, runs_off_the_bat, isThisDeliveryWide, isThisDeliveryNoBall );
        if (run === 'W' && deliveryKey) {
            pendingWicketDeliveryKey = deliveryKey;
            console.log("Stored pendingWicketDeliveryKey:", pendingWicketDeliveryKey);
        }
        // Increment counter only AFTER successful log attempt for Wide/NB/Legal/Wicket signal
        // Counter for BYES/LEGBYES is incremented within the isInExtrasMode block
        inningsDeliveryCounter++;
    } else {
        console.warn("logDeliveryAttempt function not found in savedata.js");
    }
    // --- Perform Swap AFTER Logging (if needed based on runs) ---
    if (needsSwapAfterLog) {
        swapStrikerNonStriker();
    }
    // --- Ball Advancement & Over Change (Only for Legal Deliveries) ---
    if (isLegalDelivery) {
        update_runboard(); // Update visual *before* incrementing ball_no
        ball_no++;
        if (ball_no >= 7) {
            ball_no = 1;
            over_no++;
            if (!scoreboard[over_no]) scoreboard[over_no] = [0];
            currentBowler = prompt(`Enter bowler for Over ${over_no}:`, currentBowler || "");
            if (!currentBowler) currentBowler = "Unknown";
            swapStrikerNonStriker();
            updateBatsmanDisplay();
        }
    }

    // --- Final Updates (unless waiting for Wicket modal) ---
    if (run !== 'W') {
        update_score();
        update_scoreboard();
        update_runboard(); // Highlight next ball etc.
        checkEndOfInnings();
    } else {
        // Wicket modal shown, updates happen in confirmWicket
        update_scoreboard(); // Update modal table now
        update_runboard(); // Update runboard visual (e.g., show 'W')
    }
} // End of play_ball function


// --- Target Mode Functions ---
// ... (setTarget function - no changes needed) ...
function setTarget(isTargetModeOn = true) {
    isTargetMode = isTargetModeOn;
    const targetBoard = $("#targetBoard");
    const targetModeButton = $("#targetModeButton");
    const targetSetup = $("#targetSetup"); // Assuming exists for manual input

    if (!isTargetModeOn) {
        targetBoard.hide();
        targetModeButton.show();
        targetSetup.show(); // Show setup inputs again
        targetRuns = -1; targetOvers = -1;
    } else {
        if ((currentInnings === 1 && targetRuns <= 0) || targetRuns <= 0) {
            targetRuns = parseInt($("#targetRunsInput").val()); // Get from manual input
            targetOvers = parseInt($("#targetOversInput").val());
             if(isNaN(targetRuns) || targetRuns <=0 || isNaN(targetOvers) || targetOvers <= 0){
                alert("Please enter valid Target Runs and Overs.");
                isTargetMode = false; return; // Failed
            }
        }
        updateTarget();
        targetBoard.show();
        targetModeButton.hide();
        targetSetup.hide(); // Hide setup inputs while active
    }
    // ... (sharing placeholder) ...
}

// ... (updateTarget function - no changes needed) ...
function updateTarget() {
    if (!isTargetMode || targetRuns <= 0) { updateHtml("#targetInfo", ""); return; }

    let runsRequired = targetRuns - runs;
    let currentBallsBowled = (over_no - 1) * 6 + (ball_no - 1); // Simple calculation for active play
    let totalBalls = targetOvers * 6;
    let ballsRemaining = totalBalls - currentBallsBowled;
    if (ballsRemaining < 0) ballsRemaining = 0;

    let targetText = `Target: ${targetRuns}. Need ${runsRequired} from ${ballsRemaining} balls.`;
    let resultMessage = "";
    let closeButtonHtml = '  <button type="button" class="btn-close btn-sm" aria-label="Close" onClick="setTarget(false)"></button>';

    if (runs >= targetRuns) { resultMessage = `<strong>${battingTeam} Won!</strong> Target chased.`; }
    else if (ballsRemaining <= 0 && runs < targetRuns - 1) { resultMessage = `<strong>${bowlingTeam} Won!</strong> ${battingTeam} needed ${targetRuns - runs} with 0 balls left.`; }
    else if (ballsRemaining <= 0 && runs === targetRuns - 1) { resultMessage = "<strong>Match Tied!</strong>"; }

    if (resultMessage) {
        targetText = resultMessage + closeButtonHtml;
        $("#targetModeButton").show();
        // Potentially disable buttons if innings ended due to target logic
        // checkEndOfInnings(); // Call check end of innings here too?
    }
    updateHtml("#targetInfo", targetText);
}


// --- Innings Management Functions ---
// ... (checkEndOfInnings function - no changes needed) ...
function checkEndOfInnings() {
    if (isInningsOver) return false;
    let inningsEnded = false;
    let reason = "";
    if (totalWickets >= 10) { inningsEnded = true; reason = "All out"; }
    if (!inningsEnded && maxOvers > 0 && ball_no === 1 && over_no === (maxOvers + 1)) { inningsEnded = true; reason = "Overs completed"; }
    if (!inningsEnded && currentInnings === 2 && isTargetMode && targetRuns > 0 && runs >= targetRuns) { inningsEnded = true; reason = "Target chased"; }
    // Add check for tie on last ball of match
    if (!inningsEnded && currentInnings === 2 && isTargetMode && targetRuns > 0 && maxOvers > 0 && ball_no === 1 && over_no === (maxOvers + 1) && runs === targetRuns -1 ) {
        inningsEnded = true; reason = "Match Tied";
    }


    if (inningsEnded) { endInnings(reason); return true; }
    return false;
}

// ... (endInnings function - reset isInExtrasMode here too) ...
function endInnings(reason) {
    if (isInningsOver) return;
    isInningsOver = true;
    isInExtrasMode = false; // <<<--- Reset extras mode on innings end
    $("#extras-mode-warning").hide(); // <<<--- Hide warning
    $("#run_extras").removeClass('btn-warning').addClass('btn-outline-primary'); // Reset button style

    alert(`Innings ${currentInnings} over: ${reason}`);
    console.log(`Innings ${currentInnings} ended. Reason: ${reason}. Score: ${runs}/${totalWickets}`);

    if (currentInnings === 1) {
        targetRuns = runs + 1; targetOvers = maxOvers;
        let temp = battingTeam; battingTeam = bowlingTeam; bowlingTeam = temp;
        runs = 0; totalWickets = 0; over_no = 1; ball_no = 1;
        scoreboard = [[], [0]]; isNoBall = false; isWideBall = false;
        runs_off_the_bat = 0; edited = []; inningsDeliveryCounter = 1;
        currentInnings = 2; isInningsOver = false;

        alert(`Second Innings Starting.\n${battingTeam} needs ${targetRuns} runs to win in ${targetOvers} overs.`);
        strikerName = prompt("Striker for 2nd Innings:", ""); if (!strikerName) { alert("Striker name required."); isInningsOver = true; return; }
        nonStrikerName = prompt("Non-Striker for 2nd Innings:", ""); if (!nonStrikerName) { alert("Non-Striker name required."); isInningsOver = true; return; }
        currentBowler = prompt("Opening Bowler for 2nd Innings:", ""); if (!currentBowler) currentBowler = "Unknown";

        setTarget(true);
        updateBatsmanDisplay(); updateBattingTeamDisplay(); update_score(); update_scoreboard(); update_runboard();
    } else {
        let matchResult = "";
        if (runs >= targetRuns) { matchResult = `${battingTeam} won by ${10 - totalWickets} wickets!`; }
        else if (runs === targetRuns - 1) { matchResult = "Match Tied!"; }
        else { matchResult = `${bowlingTeam} won by ${targetRuns - 1 - runs} runs!`; }
        alert(`Match Over!\n${matchResult}`);
        console.log(`Match Over. Final Score ${battingTeam}: ${runs}/${totalWickets}. ${matchResult}`);
        $("#scoringInterface .btn").prop("disabled", true);
        $("#run_extras").prop("disabled", true);
    }
}


// --- Setup and Initialization Functions ---
// ... (setMaxOvers function - no changes needed) ...
function setMaxOvers() {
    const input = $("#maxOversInput").val();
    let parsedOvers = parseInt(input, 10);
    if (isNaN(parsedOvers) || parsedOvers <= 0) { alert("Please enter a valid positive number of overs."); }
    else { maxOvers = parsedOvers; console.log("Max Overs set to:", maxOvers); alert(`Maximum overs set to ${maxOvers}.`); }
}

// ... (updateTossOptions function - no changes needed) ...
function updateTossOptions() {
    const t1 = $("#team1").val().trim(); const t2 = $("#team2").val().trim();
    const tossDropdown = $("#tossWinner"); const selectedWinner = tossDropdown.val();
    tossDropdown.html('<option value="" disabled>Select Toss Winner</option>');
    let selectionFound = false;
    if (t1) { tossDropdown.append($('<option>', { value: t1, text: t1 })); if (t1 === selectedWinner) selectionFound = true; }
    if (t2) { tossDropdown.append($('<option>', { value: t2, text: t2 })); if (t2 === selectedWinner) selectionFound = true; }
    if (selectionFound) { tossDropdown.val(selectedWinner); } else { tossDropdown.prop('selectedIndex', 0); }
}

// ... (startInnings function - reset isInExtrasMode here too) ...
function startInnings() {
    if (!generateMatchId()) return;
    const team1 = $("#team1").val().trim(); const team2 = $("#team2").val().trim();
    const tossWinner = $("#tossWinner").val(); const tossDecision = $("#tossDecision").val();
    if (!team1 || !team2 || !tossWinner || !tossDecision) { alert("Please fill in all Team and Toss details."); return; }
    if (maxOvers <= 0) { alert("Please set a valid number for Maximum Overs."); return; }

    if (tossWinner === team1) { battingTeam = (tossDecision === "bat") ? team1 : team2; bowlingTeam = (tossDecision === "bat") ? team2 : team1; }
    else { battingTeam = (tossDecision === "bat") ? team2 : team1; bowlingTeam = (tossDecision === "bat") ? team1 : team2; }
    alert(`${tossWinner} won the toss and chose to ${tossDecision}.\n${battingTeam} will bat first.`);

    strikerName = prompt("Enter name of Striker:", ""); if (!strikerName) { alert("Striker name required."); return; }
    nonStrikerName = prompt("Enter name of Non-Striker:", ""); if (!nonStrikerName) { alert("Non-Striker name required."); return; }
    currentBowler = prompt("Enter name of the Opening Bowler:", ""); if (!currentBowler) currentBowler = "Unknown";

    // Reset state
    scoreboard = [[], [0]]; ball_no = 1; over_no = 1; runs = 0; totalWickets = 0; edited = [];
    isNoBall = false; isWideBall = false; isInExtrasMode = false; isInningsOver = false; currentInnings = 1;
    runs_off_the_bat = 0; targetRuns = -1; inningsDeliveryCounter = 1; targetOvers = -1;
    setTarget(false);
    $("#extras-mode-warning").hide(); // Ensure warning is hidden
    $("#run_extras").removeClass('btn-warning').addClass('btn-outline-primary'); // Ensure button reset

    // Update UI
    updateBatsmanDisplay(); updateBattingTeamDisplay(); update_score(); update_scoreboard(); update_runboard();
    $("#matchSetup").hide(); $("#scoringInterface").show(); $("#inningsInfo").show();
    $("#scoringInterface .btn").prop("disabled", false); $("#run_extras").prop("disabled", false);
    console.log(`Innings 1 started. Batting: ${battingTeam}, Bowling: ${bowlingTeam}`);
}

// --- Document Ready ---
$(document).ready(function () {

    // --- Event Listener Setup ---
    $("#run_dot").on("click", () => play_ball("D"));
    $("#run_1").on("click", () => play_ball(1));
    $("#run_2").on("click", () => play_ball(2));
    $("#run_3").on("click", () => play_ball(3));
    $("#run_wide").on("click", () => play_ball("+"));
    $("#run_no_ball").on("click", () => play_ball("NB"));
    $("#run_4").on("click", () => play_ball(4));
    $("#run_5").on("click", () => play_ball(5)); // Listener for 5 runs
    $("#run_6").on("click", () => play_ball(6));
    $("#run_W").on("click", () => play_ball("W"));

    // Extras Button (Simplified Flow)
    $("#run_extras").on("click", startExtrasMode); // Changed to call start directly

    // Wicket Modal Buttons
    $("#strikerOutBtn").on("click", () => selectBatsmanOut('striker'));
    $("#nonStrikerOutBtn").on("click", () => selectBatsmanOut('nonStriker'));
    $("#confirmWicketBtn").on("click", confirmWicket);

    // Other Controls
    $("#swapStrikerNonStriker").on("click", swapStrikerNonStriker);
    $("#scoreboard-btn").on("click", update_scoreboard);
    $("#startInningsBtn").on("click", startInnings);
    $("#setMaxOversBtn").on("click", setMaxOvers);

    // Target Mode Controls
     $("#targetModeButton").on("click", () => setTarget(true));
     // Ensure target close button works: setup in updateTarget() function HTML

    // Team Name Input Listeners
    $("#team1").on("input", updateTossOptions);
    $("#team2").on("input", updateTossOptions);

    // --- Initialization Call ---
    function init() {
        const today = new Date().toISOString().split('T')[0];
        $("#matchDate").val(today);
        updateTossOptions();
        $("#scoringInterface").hide(); $("#inningsInfo").hide(); $("#targetBoard").hide();
        // $("#extrasInputs").hide(); // No longer used for this flow
        $("#wicketInputs").hide();
        $("#extras-mode-warning").hide(); // Ensure warning hidden on init
        updateBattingTeamDisplay(); updateBatsmanDisplay(); update_score(); update_runboard();
        console.log("Scoreboard Initialized.");
    }
    init();
});


// --- Optional/Advanced Functions Placeholders ---
// ... (back_button, publishMessage, startConnect, sendInitVariables) ...
function back_button() { console.warn("Undo not fully implemented."); }
function publishMessage(message) { console.log("Sharing Placeholder:", message); }
function startConnect() { console.log("Sharing Placeholder: startConnect"); }
function sendInitVariables() { console.log("Sharing Placeholder: sendInitVariables"); }

// --- END OF FILE main.js ---
