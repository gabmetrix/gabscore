// --- Global State Variables ---
var scoreboard = [[], [0]]; // scoreboard[<over_no>][0] counts Wide/NB extra runs
var ball_no = 1;
var over_no = 1;
var runs = 0;
var totalWickets = 0;
var edited = []; // For tracking manual edits (optional)
var isNoBall = false; // State for pending No Ball outcome
var isWideBall = false; // State for pending Wide outcome
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

    // If using sharing mode, publish changes (Placeholder)
    // if (isShareMode && !isSame) {
    //    console.log(`Publishing update for ${eleId}`);
    // 	publishMessage(
    // 		JSON.stringify({
    // 			update: { eleId: eleId, newHtml: newHtml },
    // 		})
    // 	);
    // }
}

function generateMatchId() {
    const team1 = $("#team1").val().trim().replace(/\s+/g, '');
    const team2 = $("#team2").val().trim().replace(/\s+/g, '');
    const date = $("#matchDate").val();

    if (!team1 || !team2 || !date) {
        alert("Please enter both team names and select a match date.");
        return null; // Indicate failure
    }

    matchId = `${date}_${team1}_v_${team2}`;
    console.log("Generated matchId:", matchId);
    // Optionally display it: $("#matchIdDisplay").text(`Match ID: ${matchId}`);
    return matchId;
}

function swapStrikerNonStriker() {
    console.log(`Swapping Strike: ${strikerName} <-> ${nonStrikerName}`);
    let temp = strikerName;
    strikerName = nonStrikerName;
    nonStrikerName = temp;
    updateBatsmanDisplay(); // Update UI immediately
}

function autoSwapBatsmanOnSingleOrTriple(runValue) {
    // Ensure runValue is a number before checking
    if (typeof runValue === 'number' && (runValue === 1 || runValue === 3)) {
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

// MIlan look here: Definition of update_score
function update_score() {
    let calculatedScore = 0;
    let calculatedWickets = 0;

    // Iterate through each over recorded
    for (let i = 1; i < scoreboard.length; i++) { // Start from over 1
        if (!scoreboard[i]) continue; // Skip if over data doesn't exist

        // Add extras stored in index 0
        calculatedScore += scoreboard[i][0] || 0;

        // Iterate through balls (index 1 to 6)
        for (let j = 1; j < scoreboard[i].length; j++) {
            const ball = scoreboard[i][j];
            if (ball === undefined || ball === null) continue;

            if (typeof ball === 'number') {
                calculatedScore += ball;
            } else if (typeof ball === 'string') {
                if (ball === 'W') {
                    calculatedWickets++;
                } else if (ball === 'D') {
                    // Dot ball, score doesn't change
                } else if (ball.startsWith('B') || ball.startsWith('L')) {
                    // Bye or Leg Bye - extract runs
                    const byeRuns = parseInt(ball.substring(1), 10);
                    if (!isNaN(byeRuns)) {
                        calculatedScore += byeRuns;
                    }
                }
                // NB/Wide runs are already counted in scoreboard[i][0]
            }
        }
    }

    runs = calculatedScore; // Update global runs
    totalWickets = calculatedWickets; // Update global wickets

    // Update display elements
    updateHtml("#run", runs);
    updateHtml("#wickets", totalWickets);

    // Update target display if necessary
    updateTarget();

    console.log(`Score Updated: ${runs}/${totalWickets}`);
}

function update_scoreboard() {
    // Updates the table in the modal
    var tableContent = "<tr><th>Over</th><th>Score (Extras)</th></tr>";
    for (let i = 1; i < scoreboard.length; i++) { // Iterate over recorded overs
        if (!scoreboard[i]) continue;
        tableContent += "<tr>";
        tableContent += `<td>${i}</td>`;
        // Format balls: slice(1) takes elements from index 1 onwards
        let ballsDisplay = scoreboard[i].slice(1).map(b => (b === undefined || b === null) ? '_' : b).join(' ');
        let extras = scoreboard[i][0] || 0;
        tableContent += `<td>${ballsDisplay} (${extras})</td>`;
        tableContent += "</tr>";
    }
    updateHtml("#scoreboard", tableContent);
}

function update_runboard() {
    // Updates the current over display (the 6 balls)
    if (!scoreboard[over_no]) { // Ensure current over array exists
        scoreboard[over_no] = [0]; // Initialize with extras count if needed
    }

    for (let i = 1; i <= 6; i++) {
        let score_val = scoreboard[over_no][i];
        let display_val = (score_val === undefined || score_val === null) ? "" : score_val;
        updateHtml("#ball_no_" + i.toString(), display_val);

        // Reset styles first
        $("#ball_no_" + i.toString()).removeClass("btn-primary btn-danger btn-secondary").addClass("btn-light");

        // Apply style based on value
        if (score_val === 'W') {
            $("#ball_no_" + i.toString()).removeClass("btn-light").addClass("btn-danger");
        } else if (score_val === 'D') {
             $("#ball_no_" + i.toString()).removeClass("btn-light").addClass("btn-secondary"); // Grey for dot
        } else if (typeof score_val === 'number' && score_val > 0) {
            // Keep it light for runs? Or maybe primary briefly? Let's keep light.
        } else if (typeof score_val === 'string' && (score_val.startsWith('B') || score_val.startsWith('L'))) {
             // Style for byes/legbyes? Maybe keep light.
        }
    }

    // Highlight the *next* ball to be bowled, unless an illegal ball state is active
    if (!isNoBall && !isWideBall && ball_no <= 6) {
        $("#ball_no_" + ball_no.toString()).removeClass("btn-light").addClass("btn-primary");
    }

    // Update Over.Ball display (e.g., 0.1, 5.6)
    // Calculate balls bowled in the current over correctly
    let balls_this_over = ball_no - 1;
    if (balls_this_over < 0) balls_this_over = 0; // Should not happen, but safety
    if (balls_this_over >= 6) balls_this_over = 6; // Show X.6 at end of over before next one starts

    let overs_completed = over_no - 1;

    updateHtml("#over-ball", `${overs_completed}.${balls_this_over}`);
}


// --- State Management Functions ---

function noBall(is_NoBall) {
    isNoBall = is_NoBall; // Update global state
    var run_no_ball = $("#run_no_ball");
    var run_wide = $("#run_wide");

    if (is_NoBall) {
        $("#no-ball-warning").show();
        run_wide.prop("disabled", true);
        run_no_ball.prop("disabled", true);
        // Wicket button remains enabled, runs buttons remain enabled

        run_no_ball.removeClass("btn-outline-primary").addClass("btn-danger text-white");
    } else {
        $("#no-ball-warning").hide();
        run_wide.prop("disabled", false);
        run_no_ball.prop("disabled", false);

        run_no_ball.removeClass("btn-danger text-white").addClass("btn-outline-primary");
    }
    update_runboard(); // Update highlights
}

function wideBall(is_WideBall) {
    isWideBall = is_WideBall; // Update global state
    var run_wide = $("#run_wide");
    var run_no_ball = $("#run_no_ball");

    if (is_WideBall) {
        $("#wide-ball-warning").show();
        run_wide.prop("disabled", true);
        run_no_ball.prop("disabled", true);
        // Wicket button remains enabled (stumping/run out), runs buttons remain enabled

        run_wide.removeClass("btn-outline-primary").addClass("btn-danger text-white");
    } else {
        $("#wide-ball-warning").hide();
        run_wide.prop("disabled", false);
        run_no_ball.prop("disabled", false);

        run_wide.removeClass("btn-danger text-white").addClass("btn-outline-primary");
    }
    update_runboard(); // Update highlights
}

// --- Modal/Interaction Functions ---

function showExtrasInputs() {
    $("#wicketInputs").hide(); // Hide wicket UI if open
    $("#extrasInputs").show();
}

function hideExtrasInputs() {
    $("#extrasInputs").hide();
    $("#extrasRunsInput").val(0); // Reset input value
    $("#extrasTypeSelect").val("byes"); // Reset dropdown
}

function confirmExtras() {
    const extrasType = $("#extrasTypeSelect").val(); // "byes", "leg_byes"
    const extrasRuns = parseInt($("#extrasRunsInput").val()) || 0;
    let local_runs_off_bat = 0; // Extras are not off the bat

    if (extrasRuns < 0 || extrasRuns > 6) {
        alert("Please enter a valid number of runs (0-6)");
        return;
    }

    let outcomeSymbol = "";
    let isLegalDelivery = false;

    if (extrasType === "byes" || extrasType === "leg_byes") {
        isLegalDelivery = true;
        runs += extrasRuns; // Add the runs scored (not +1 delivery cost)
        outcomeSymbol = `${extrasType.charAt(0).toUpperCase()}${extrasRuns}`;
        // Extras count scoreboard[over_no][0] is NOT increased for B/LB
    } else {
        alert("Invalid extra type selected. Use Wide/No Ball buttons for those.");
        hideExtrasInputs();
        return;
    }

	console.log(`Ball ${over_no}.${ball_no}: Delivery Outcome=${outcomeSymbol}, Runs off bat = ${local_runs_off_bat}`);
	// <<< --- MILAN LOOK HERE: REVISED FIREBASE CALL for EXTRAS --- >>>
	if (isLegalDelivery && typeof logExtrasDelivery === "function") {
		logExtrasDelivery(extrasType, extrasRuns); // Call new function
	} else if (isLegalDelivery) { // Only warn if function missing but should have been called
		console.warn("logExtrasDelivery function not found in savedata.js");
	}
	// <<< --- END OF REVISED FIREBASE CALL for EXTRAS --- >>>
    if (isLegalDelivery) {
        if (!scoreboard[over_no]) scoreboard[over_no] = [0]; // Ensure over array exists
        scoreboard[over_no][ball_no] = outcomeSymbol; // Record on scoreboard

        update_runboard(); // Update visual before increment

        ball_no++; // Advance ball count

        if (extrasRuns % 2 === 1) { // Swap batsmen if odd runs scored
             swapStrikerNonStriker();
        }

        // Check for End of Over
        if (ball_no >= 7) {
            ball_no = 1;
            over_no++;
            if (!scoreboard[over_no]) scoreboard[over_no] = [0]; // Init next over extras
            currentBowler = prompt(`Enter bowler for Over ${over_no}:`, currentBowler || "");
            if (!currentBowler) currentBowler = "Unknown";
            swapStrikerNonStriker(); // End of over swap
            updateBatsmanDisplay(); // Update bowler display
             // Clear previous over's highlights (optional but good)
             // for (let i = 1; i <= 6; i++) { $("#ball_no_" + i.toString()).removeClass("btn-primary btn-danger btn-secondary").addClass("btn-light"); }
        }
    }

    // Update score display and modal
    update_score(); // Recalculates totals
    update_scoreboard();
    updateBatsmanDisplay(); // If swap occurred
    update_runboard(); // Update highlight for next ball

    hideExtrasInputs(); // Hide the form
    checkEndOfInnings(); // Check if innings ended
}


function selectBatsmanOut(player) {
  playerOut = player; // Store 'striker' or 'nonStriker'

  $("#newBatsmanSection").show();
  $("#newBatsmanInput").focus();

  // Update button styles
  $("#strikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary");
  $("#nonStrikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary");
  // Reset text from potential "OUT: ..."
  $("#strikerOutBtn").text(strikerName || 'Striker?');
  $("#nonStrikerOutBtn").text(nonStrikerName || 'Non-Striker?');


  if (player === "striker") {
    $("#strikerOutBtn").removeClass("btn-outline-primary").addClass("btn-danger");
    $("#strikerOutBtn").text(`OUT: ${strikerName || 'Striker?'}`); // Show selection
  } else {
    $("#nonStrikerOutBtn").removeClass("btn-outline-primary").addClass("btn-danger");
    $("#nonStrikerOutBtn").text(`OUT: ${nonStrikerName || 'Non-Striker?'}`); // Show selection
  }
}

function showWicketUI() {
    // Update button text *before* showing
    $("#strikerOutBtn").text(strikerName || "Striker?");
    $("#nonStrikerOutBtn").text(nonStrikerName || "Non-Striker?");

    playerOut = ""; // Reset selection

    // Reset button visual state
    $("#strikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary");
    $("#nonStrikerOutBtn").removeClass("btn-danger").addClass("btn-outline-primary");

    $("#newBatsmanSection").hide(); // Hide new batsman input initially
    $("#newBatsmanInput").val(""); // Clear input
    $("#wicketTypeSelect").prop('selectedIndex', 0); // Reset dropdown

    $("#wicketInputs").show(); // Show the wicket UI section
    hideExtrasInputs(); // Hide extras UI if open
}

function confirmWicket() {
    const wicketType = $("#wicketTypeSelect").val();
    const newBatsman = $("#newBatsmanInput").val().trim();

    if (!playerOut) {
        alert("Please select which batsman is out.");
        return;
    }

    // Allow confirmation without new batsman ONLY if it's the 10th wicket
    if (totalWickets >= 9 && !newBatsman) {
        console.log("Confirming 10th wicket.");
    } else if (!newBatsman) {
        alert("Please enter the new batsman's name.");
        return;
    }

    let outPlayerName = (playerOut === "striker") ? strikerName : nonStrikerName;

    // Replace batsman name *if* a new one is provided
    if (newBatsman) {
        if (playerOut === "striker") {
            strikerName = newBatsman;
        } else {
            nonStrikerName = newBatsman;
        }
         alert(`${outPlayerName} is out (${wicketType}). New batsman: ${newBatsman}`);
    } else {
        // 10th wicket, just record who was out
        alert(`${outPlayerName} is out (${wicketType}). All out!`);
        if (playerOut === "striker") strikerName = "N/A (All Out)";
        else nonStrikerName = "N/A (All Out)";
    }


    // Note: Wicket ('W') is recorded in scoreboard array by play_ball for *legal* deliveries.
    // For Wkts on NB/Wide, totalWickets is incremented, but 'W' is not put in ball slot.

    updateBatsmanDisplay(); // Show new names or "N/A" state

    $("#wicketInputs").hide(); // Hide the modal/UI

	// <<< --- MILAN LOOK HERE: ADD FIREBASE WICKET UPDATE CALL --- >>>
    console.log("Checking pendingWicketDeliveryKey before update:", pendingWicketDeliveryKey); // Debug log
    if (pendingWicketDeliveryKey && typeof updateWicketDetails === "function") {
        updateWicketDetails(pendingWicketDeliveryKey, wicketType, outPlayerName);
    } else if (pendingWicketDeliveryKey) { // Only warn if key existed but function didn't
         console.warn("updateWicketDetails function not found in savedata.js");
    } else {
        console.warn("Could not update wicket details in Firebase: pendingWicketDeliveryKey was not set.");
    }
    pendingWicketDeliveryKey = null; // Clear the key after attempting update
    // <<< --- END OF FIREBASE WICKET UPDATE CALL --- >>>

    // Score update should happen *after* play_ball finishes processing the wicket
    // If play_ball called showWicketUI, it will call update_score later.
    // If Wicket button pressed independently (unlikely here), need update_score.
    // Let's ensure update_score happens:
    update_score(); // Recalculates total wickets

    update_runboard(); // Refresh runboard state

    // Check innings end *after* wicket is fully processed
    checkEndOfInnings();

    // Reset selection variable for next time
    playerOut = "";
}


// --- Main Game Logic ---

// --- Main Game Logic ---

function play_ball(run) {
    runs_off_the_bat = 0; // Reset for this action
    let deliveryOutcomeDescription = "";
    let logBallNo = ball_no;
    let logOverNo = over_no;

    if (isInningsOver) {
        alert("Innings is already over!");
        return;
    }

    // Ensure current over array exists
    if (!scoreboard[over_no]) {
        scoreboard[over_no] = [0]; // Initialize with 0 extras
    }

    // --- Handle Special Ball Type SIGNALS First ---
    if (run === "+") { // WIDE Signal
        wideBall(true);
        runs++;
        scoreboard[over_no][0]++; // Add 1 to extras count
        update_score(); // Update score display immediately for the +1
        // update_scoreboard(); // Update modal view if open
        return; // Wait for the next click (outcome of the wide)
    }

    if (run === "NB") { // NO BALL Signal
        noBall(true);
        runs++;
        scoreboard[over_no][0]++; // Add 1 to extras count
        update_score(); // Update score display immediately for the +1
        // update_scoreboard(); // Update modal view if open
        return; // Wait for the next click (outcome of the NB)
    }

    // --- Process the Outcome of a Delivery ---
    let isThisDeliveryWide = isWideBall;
    let isThisDeliveryNoBall = isNoBall;

    let clickedRuns = 0;
    let outcomeBaseDescription = "";
    let isLegalDelivery = false; // Flag to track if ball count advances

    // Determine runs_off_the_bat based on the CLICKED outcome first
    if (run === "W") {
        clickedRuns = 0;
        outcomeBaseDescription = "Wicket";
        runs_off_the_bat = 0; // Wicket itself is 0 runs off bat
    } else if (run === "D") {
        clickedRuns = 0;
        outcomeBaseDescription = "0";
        runs_off_the_bat = 0;
    } else if ([1, 2, 3, 4, 6].includes(run)) {
        clickedRuns = run;
        outcomeBaseDescription = `${run}`;
        runs_off_the_bat = run; // Assign runs based on click
    } else {
        console.error("Invalid run value received:", run);
        return;
    }

    // --- Apply Consequences based on delivery type ---

    if (isThisDeliveryWide) {
        deliveryOutcomeDescription = `Wide + ${outcomeBaseDescription}`;
        // MIlan look here: REMOVED the line "runs_off_the_bat = 0;"
        // Now, runs_off_the_bat retains the value from the clicked outcome (e.g., 3 if '3' was clicked)

        runs += clickedRuns; // Add runs scored *during* wide
        scoreboard[over_no][0] += clickedRuns; // These runs are also extras

        if (run === "W") {
            showWicketUI(); // Show UI
            totalWickets++; // Increment wicket count
            // update_score will be called after modal confirmation
        } else if (clickedRuns === 1 || clickedRuns === 3) {
            swapStrikerNonStriker(); // Swap on odd runs during wide
        }

        wideBall(false); // Reset state
        isLegalDelivery = false; // Wide does not count as a legal ball

    } else if (isThisDeliveryNoBall) {
        deliveryOutcomeDescription = `No Ball + ${outcomeBaseDescription}`;
        // runs_off_the_bat was set correctly above based on the clicked run

        runs += runs_off_the_bat; // Add runs off bat during NB
        scoreboard[over_no][0] += runs_off_the_bat; // These runs are also extras

        if (run === "W") {
             showWicketUI();
             totalWickets++;
             // update_score after modal confirmation
        } else if (runs_off_the_bat === 1 || runs_off_the_bat === 3) {
             swapStrikerNonStriker(); // Swap on odd runs off bat during NB
        }

        noBall(false); // Reset state
        isLegalDelivery = false; // No Ball does not count as a legal ball

    } else {
        // --- LEGAL Delivery ---
        deliveryOutcomeDescription = outcomeBaseDescription;
        isLegalDelivery = true; // Counts as a ball bowled
        // runs_off_the_bat set correctly above

        runs += runs_off_the_bat; // Add runs off bat to total

        if (run === "W") {
            showWicketUI(); // Show UI to confirm details
            totalWickets++; // Increment wicket count here
            // Ensure over array exists before assignment
             if (!scoreboard[over_no]) scoreboard[over_no] = [0];
            scoreboard[over_no][ball_no] = 'W'; // Record W on scoreboard for legal ball
            // update_score happens after modal confirmation
        } else {
            // Record runs (or 'D' for dot) on scoreboard for legal ball
             // Ensure over array exists before assignment
             if (!scoreboard[over_no]) scoreboard[over_no] = [0];
            scoreboard[over_no][ball_no] = (run === "D") ? 'D' : runs_off_the_bat;
            autoSwapBatsmanOnSingleOrTriple(runs_off_the_bat); // Swap on odd runs
        }
    }

    // --- Centralized Logging ---
    console.log(`Ball ${logOverNo}.${logBallNo}: Delivery Outcome=${deliveryOutcomeDescription}, Runs off bat = ${runs_off_the_bat}`);
	 // <<< --- MILAN LOOK HERE: REVISED FIREBASE CALL --- >>>
	 pendingWicketDeliveryKey = null; // Clear any previous key
	 if (typeof logDeliveryAttempt === "function") {
		 // Pass the specific outcome details from this event
		 const deliveryKey = logDeliveryAttempt(
			 run, // The raw outcome clicked ('W', 'D', 1, 2, etc.)
			 runs_off_the_bat, // Runs relevant to this action (off bat or during illegal ball)
			 isThisDeliveryWide,
			 isThisDeliveryNoBall
		 );
		 // If a wicket was the outcome, store the key for later update
		 if (run === 'W' && deliveryKey) {
			 pendingWicketDeliveryKey = deliveryKey;
			 console.log("Stored pendingWicketDeliveryKey:", pendingWicketDeliveryKey); // Debug log
		 }
	 } else {
		 console.warn("logDeliveryAttempt function not found in savedata.js");
	 }
	 // <<< --- END OF REVISED FIREBASE CALL --- >>>
    // --- Ball Advancement & Over Change (Only for Legal Deliveries) ---
    if (isLegalDelivery) {
        update_runboard(); // Update visual *before* incrementing ball_no logical counter
        ball_no++;

        if (ball_no >= 7) { // End of Over
            ball_no = 1;
            over_no++;
            if (!scoreboard[over_no]) scoreboard[over_no] = [0]; // Init next over extras
            currentBowler = prompt(`Enter bowler for Over ${over_no}:`, currentBowler || "");
            if (!currentBowler) currentBowler = "Unknown";
            swapStrikerNonStriker(); // End of over swap
            updateBatsmanDisplay(); // Update bowler display
        }
    }

    // --- Final Updates (unless waiting for Wicket modal) ---
    if (run !== 'W') { // If not a wicket, update score and check innings now
        update_score();
        update_scoreboard(); // Update modal scoreboard data
        update_runboard(); // Update current over display (highlight next ball etc.)
        checkEndOfInnings();
    } else {
        // If Wicket, update_score/checkEndOfInnings happens in confirmWicket()
        // Update scoreboard modal data now, runboard might need update after confirm too
         update_scoreboard();
         update_runboard(); // Update to show 'W' if legal, or remove highlight if NB/W
    }
} // End of play_ball function

// --- Target Mode Functions ---

function setTarget(isTargetModeOn = true) {
    isTargetMode = isTargetModeOn;
    const targetBoard = $("#targetBoard"); // The display area
    const targetModeButton = $("#targetModeButton"); // Button to turn ON
    const targetSetup = $("#targetSetup"); // Input fields div

    if (!isTargetModeOn) { // Turning OFF
        targetBoard.hide();
        targetModeButton.show();
        targetSetup.show();
        targetRuns = -1;
        targetOvers = -1;
    } else { // Turning ON
        // If 1st innings or target not set, try reading from inputs
        if ((currentInnings === 1 && targetRuns <= 0) || targetRuns <= 0) {
            targetRuns = parseInt($("#targetRunsInput").val());
            targetOvers = parseInt($("#targetOversInput").val());
             if(isNaN(targetRuns) || targetRuns <=0 || isNaN(targetOvers) || targetOvers <= 0){
                alert("Please enter valid Target Runs and Overs.");
                isTargetMode = false; // Failed
                return;
            }
        }
        // If target was set automatically (e.g., endInnings), it will use those values

        updateTarget(); // Calculate and display required/remaining
        targetBoard.show();
        targetModeButton.hide();
        targetSetup.hide();
    }
    // Publish state change if sharing (Placeholder)
    // if (isShareMode) { publishMessage(...); }
}

function updateTarget() {
    if (!isTargetMode || targetRuns <= 0) {
        updateHtml("#targetInfo", ""); // Clear display if inactive
        return;
    }

    let runsRequired = targetRuns - runs;
    // Calculate balls remaining more accurately: Total balls - balls legally bowled so far
    let currentBallsBowled = 0;
     for(let ov = 1; ov < over_no; ov++) { // Count balls in completed overs
         currentBallsBowled += scoreboard[ov] ? scoreboard[ov].slice(1).filter(b => b !== undefined && b !== null).length : 0;
         // This ^ counts actual recorded balls, might be less than 6 if innings ended mid-over. A simpler way for active play:
     }
     // Simpler way for active innings: (full overs completed * 6) + balls in current over
     currentBallsBowled = (over_no - 1) * 6 + (ball_no - 1); // Assumes full overs were bowled previously


    let totalBalls = targetOvers * 6;
    let ballsRemaining = totalBalls - currentBallsBowled;
    if (ballsRemaining < 0) ballsRemaining = 0; // Cannot have negative balls remaining

    let targetText = `Target: ${targetRuns}. Need ${runsRequired} from ${ballsRemaining} balls.`;
    let resultMessage = "";
    let closeButtonHtml = '  <button type="button" class="btn-close btn-sm" aria-label="Close" onClick="setTarget(false)"></button>';

    // Check for definitive results based on target
    if (runs >= targetRuns) {
        resultMessage = `<strong>${battingTeam} Won!</strong> Target chased.`;
        // isInningsOver = true; // This should be set by checkEndOfInnings
    } else if (ballsRemaining <= 0 && runs < targetRuns - 1) {
         resultMessage = `<strong>${bowlingTeam} Won!</strong> ${battingTeam} need ${targetRuns - runs} runs with 0 balls left.`;
         // isInningsOver = true;
    } else if (ballsRemaining <= 0 && runs === targetRuns - 1) {
         resultMessage = "<strong>Match Tied!</strong>";
         // isInningsOver = true;
    }

    if (resultMessage) {
        targetText = resultMessage + closeButtonHtml;
        $("#targetModeButton").show(); // Show button to turn off display
        // Consider disabling scoring buttons if match ended based on target
        // $("#scoringInterface .btn").prop("disabled", true);
    }

    updateHtml("#targetInfo", targetText);
}


// --- Innings Management Functions ---

function checkEndOfInnings() {
    if (isInningsOver) return false; // Already ended, don't trigger again

    let inningsEnded = false;
    let reason = "";

    // 1. All wickets lost
    if (totalWickets >= 10) {
        inningsEnded = true;
        reason = "All out";
    }

    // 2. Max overs bowled
    // Check occurs *after* a legal ball is processed. If ball_no becomes 1 and over_no is now > maxOvers, the last over just finished.
    if (!inningsEnded && maxOvers > 0 && ball_no === 1 && over_no === (maxOvers + 1)) {
         inningsEnded = true;
         reason = "Overs completed";
    }

    // 3. Target reached (only in 2nd innings)
    if (!inningsEnded && currentInnings === 2 && isTargetMode && targetRuns > 0 && runs >= targetRuns) {
        inningsEnded = true;
        reason = "Target chased";
    }

    // 4. Target becomes impossible? (More complex, often covered by overs/wickets)
    // Example: Need 10 runs off last ball. Handled by overs completed + score comparison.

    if (inningsEnded) {
        endInnings(reason);
        return true; // Indicate innings ended
    }

    return false; // Innings continues
}

function endInnings(reason) {
    if (isInningsOver) return; // Prevent double execution

    isInningsOver = true;
    alert(`Innings ${currentInnings} over: ${reason}`);
    console.log(`Innings ${currentInnings} ended. Reason: ${reason}. Score: ${runs}/${totalWickets}`);

    if (currentInnings === 1) {
        // --- Prepare for Second Innings ---
        targetRuns = runs + 1;
        targetOvers = maxOvers;

        // Swap teams
        let temp = battingTeam;
        battingTeam = bowlingTeam;
        bowlingTeam = temp;

        // Reset state for 2nd innings
        runs = 0;
        totalWickets = 0;
        over_no = 1;
        ball_no = 1;
        scoreboard = [[], [0]]; // Reset scoreboard completely
        isNoBall = false;
        isWideBall = false;
        runs_off_the_bat = 0;
        edited = [];
        currentInnings = 2;
        isInningsOver = false; // Ready for next innings

        alert(`Second Innings Starting.\nTeam ${battingTeam} needs ${targetRuns} runs to win in ${targetOvers} overs.`);

        // Get players for 2nd innings
        strikerName = prompt("Enter name of the Striker for 2nd Innings:");
         if (!strikerName) { alert("Striker name required."); isInningsOver = true; return; }
        nonStrikerName = prompt("Enter name of the Non-Striker for 2nd Innings:");
         if (!nonStrikerName) { alert("Non-Striker name required."); isInningsOver = true; return; }
        currentBowler = prompt("Enter name of the Opening Bowler for 2nd Innings:");
        if (!currentBowler) currentBowler = "Unknown";

        // Update UI for 2nd innings
        setTarget(true); // Turn on target mode automatically
        updateBatsmanDisplay();
        updateBattingTeamDisplay();
        update_score();
        update_scoreboard();
        update_runboard(); // Reset runboard visual

    } else {
        // --- Match Over ---
        let matchResult = "";
         // Recalculate result based on final state
        if (runs >= targetRuns) {
            matchResult = `${battingTeam} won by ${10 - totalWickets} wickets!`;
        } else if (runs === targetRuns - 1) {
            matchResult = "Match Tied!";
        } else {
             matchResult = `${bowlingTeam} won by ${targetRuns - 1 - runs} runs!`;
        }
        alert(`Match Over!\n${matchResult}`);
        console.log(`Match Over. Final Score ${battingTeam}: ${runs}/${totalWickets}. ${matchResult}`);

        // Disable scoring buttons after match ends
        $("#scoringInterface .btn").prop("disabled", true);
        $("#run_extras").prop("disabled", true); // Disable extras button too
    }
}


// --- Setup and Initialization Functions ---

function setMaxOvers() {
    const input = $("#maxOversInput").val();
    let parsedOvers = parseInt(input, 10);

    if (isNaN(parsedOvers) || parsedOvers <= 0) {
        alert("Please enter a valid positive number of overs.");
        // Optionally reset input: $("#maxOversInput").val(maxOvers > 0 ? maxOvers : '');
    } else {
        maxOvers = parsedOvers;
        console.log("Max Overs set to:", maxOvers);
        alert(`Maximum overs set to ${maxOvers}.`);
        // Optionally update target if already set: updateTarget();
    }
}

function updateTossOptions() {
    const t1 = $("#team1").val().trim();
    const t2 = $("#team2").val().trim();
    const tossDropdown = $("#tossWinner");
    const selectedWinner = tossDropdown.val(); // Remember selection

    tossDropdown.html('<option value="" disabled>Select Toss Winner</option>'); // Reset

    let selectionFound = false;
    if (t1) {
        tossDropdown.append($('<option>', { value: t1, text: t1 }));
        if (t1 === selectedWinner) selectionFound = true;
    }
    if (t2) {
        tossDropdown.append($('<option>', { value: t2, text: t2 }));
        if (t2 === selectedWinner) selectionFound = true;
    }

    if (selectionFound) {
        tossDropdown.val(selectedWinner); // Restore selection
    } else {
        tossDropdown.prop('selectedIndex', 0); // Default to "Select..."
    }
}

function startInnings() {
    if (!generateMatchId()) return; // Stop if teams/date missing

    const team1 = $("#team1").val().trim();
    const team2 = $("#team2").val().trim();
    const tossWinner = $("#tossWinner").val();
    const tossDecision = $("#tossDecision").val();

    if (!team1 || !team2 || !tossWinner || !tossDecision) {
        alert("Please fill in all Team and Toss details.");
        return;
    }
     if (maxOvers <= 0) {
        alert("Please set a valid number for Maximum Overs using the 'Set Overs' button.");
        return;
    }

    // Determine batting/bowling teams
    if (tossWinner === team1) {
        battingTeam = (tossDecision === "bat") ? team1 : team2;
        bowlingTeam = (tossDecision === "bat") ? team2 : team1;
    } else { // tossWinner === team2
        battingTeam = (tossDecision === "bat") ? team2 : team1;
        bowlingTeam = (tossDecision === "bat") ? team1 : team2;
    }

    alert(`${tossWinner} won the toss and chose to ${tossDecision}.\n${battingTeam} will bat first.`);

    // Get Initial Players
    strikerName = prompt("Enter name of Striker:", strikerName || "");
    if (!strikerName) { alert("Striker name required."); return; }
    nonStrikerName = prompt("Enter name of Non-Striker:", nonStrikerName || "");
    if (!nonStrikerName) { alert("Non-Striker name required."); return; }
    currentBowler = prompt("Enter name of the Opening Bowler:", currentBowler || "");
    if (!currentBowler) currentBowler = "Unknown";

    // Reset Scorecard State for Innings 1
    scoreboard = [[], [0]];
    ball_no = 1;
    over_no = 1;
    runs = 0;
    totalWickets = 0;
    edited = [];
    isNoBall = false;
    isWideBall = false;
    isInningsOver = false;
    currentInnings = 1;
    runs_off_the_bat = 0;
    targetRuns = -1; // Reset target for new match
    targetOvers = -1;
    setTarget(false); // Ensure target mode display is off initially

    // Update UI fully
    updateBatsmanDisplay();
    updateBattingTeamDisplay();
    update_score(); // Call AFTER resetting state
    update_scoreboard();
    update_runboard();

    // Show/Hide relevant sections
    $("#matchSetup").hide();
    $("#scoringInterface").show();
    $("#inningsInfo").show();
    // Ensure scoring buttons are enabled
    $("#scoringInterface .btn").prop("disabled", false);
    $("#run_extras").prop("disabled", false);


    console.log(`Innings 1 started. Batting: ${battingTeam}, Bowling: ${bowlingTeam}`);
}

// --- Document Ready ---
$(document).ready(function () {

    // --- Event Listener Setup ---
    $("#run_dot").on("click", () => play_ball("D"));
    $("#run_1").on("click", () => play_ball(1));
    $("#run_2").on("click", () => play_ball(2));
    $("#run_3").on("click", () => play_ball(3));
    $("#run_wide").on("click", () => play_ball("+")); // Signal for Wide
    $("#run_no_ball").on("click", () => play_ball("NB")); // Signal for No Ball
    $("#run_4").on("click", () => play_ball(4));
    $("#run_6").on("click", () => play_ball(6));
    $("#run_W").on("click", () => play_ball("W"));

    // Extras Modal Buttons
    $("#run_extras").on("click", showExtrasInputs);
    $("#confirmExtras").on("click", confirmExtras);
    $("#cancelExtras").on("click", hideExtrasInputs);

    // Wicket Modal Buttons
    $("#strikerOutBtn").on("click", () => selectBatsmanOut('striker'));
    $("#nonStrikerOutBtn").on("click", () => selectBatsmanOut('nonStriker'));
    $("#confirmWicketBtn").on("click", confirmWicket); // Ensure button ID matches HTML

    // Other Controls
    $("#swapStrikerNonStriker").on("click", swapStrikerNonStriker); // Manual swap button
    $("#scoreboard-btn").on("click", update_scoreboard); // Show/Update modal
    $("#startInningsBtn").on("click", startInnings); // Button to start the match/innings 1
    $("#setMaxOversBtn").on("click", setMaxOvers); // Button to set max overs

    // Target Mode Controls
     $("#targetModeButton").on("click", () => setTarget(true)); // Button to enable manual target mode
     // Close button inside target display calls setTarget(false) directly via onClick

    // Team Name Input Listeners
    $("#team1").on("input", updateTossOptions);
    $("#team2").on("input", updateTossOptions);

    // --- Initialization Call ---
    function init() {
        // Set default date
        const today = new Date().toISOString().split('T')[0];
        $("#matchDate").val(today);
        // Update toss options based on any pre-filled team names
        updateTossOptions();
        // Hide elements that shouldn't be visible initially
        $("#scoringInterface").hide();
        $("#inningsInfo").hide();
        $("#targetBoard").hide();
        $("#extrasInputs").hide();
        $("#wicketInputs").hide();
        // Initial UI updates for empty state
        updateBattingTeamDisplay();
        updateBatsmanDisplay();
        update_score();
        update_runboard();

        console.log("Scoreboard Initialized.");
    }

    init(); // Run initialization logic
});


// --- Optional/Advanced Functions (Placeholder/Example) ---

// Example: Function to handle back button (undo last ball) - Needs careful implementation

function back_button() {
    if (over_no === 1 && ball_no === 1 && !isNoBall && !isWideBall) return; // Cannot undo before first ball

    // Complex logic needed here:
    // 1. Determine what the last action was (legal ball, NB+outcome, W+outcome, extra).
    // 2. Revert scoreboard array entry.
    // 3. Revert runs, wickets, ball_no, over_no.
    // 4. Revert batsman positions if swapped.
    // 5. Revert isNoBall/isWideBall state if necessary.
    // 6. Update all UI elements.
    // This is tricky due to the delayed state changes for NB/Wide.
    console.warn("Undo functionality not fully implemented.");
}


// Example: Placeholder for sending data in Share Mode

function publishMessage(message) {
    if (!isShareMode || !peerConnection) return; // Check connection exists
    try {
        // Assuming peerConnection is a WebRTC or WebSocket connection object
        // peerConnection.send(message);
        console.log("Sharing Message (Placeholder):", message);
    } catch (error) {
        console.error("Error sending message:", error);
    }
}


// Example: Placeholder for initiating sharing connection

function startConnect() {
    console.log("Attempting to start sharing connection (Placeholder)...");
    // Implement WebRTC or WebSocket setup here
    isShareMode = true; // Set flag on successful connection
    // On connection, potentially call sendInitVariables()
    // sendInitVariables();
}

function sendInitVariables() { // For initializing a newly connected peer
    if(!isShareMode) return;
     console.log("Sending initial state for sharing (Placeholder)...");
    let fullState = {
        // Capture all necessary state variables and UI HTML content
        // ... (as defined in previous examples) ...
    };
	// publishMessage(JSON.stringify({ initState: fullState }));
}
