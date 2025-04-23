
<div class="col-6 d-flex align-items-center justify-content-center py-2 px-1 run-btn">
<button id="switchInningsBtn" class="btn btn-primary btn-sm w-100"
		style="line-height: 1.2; padding: 0.375rem 0.75rem;">Switch Innings</button>
</div>

updateInningDisplay(); // ✅ This shows "First Inning" on load


function updateInningDisplay() {
	const inningText = currentInnings === 1 ? "First Inning" : "Second Inning";
	document.getElementById("inningDisplay").innerText = inningText;
}
function switchInnings() {
	currentInnings = currentInnings === 1 ? 2 : 1;
	updateInningDisplay(); // you already have this function
}
document.getElementById("switchInningsBtn").addEventListener("click", switchInnings);


        <div class="col-sm-2">
          <label class="form-label">Match ID</label>
          <input id="matchId" type="text" class="form-control" placeholder="Match ID">
        </div>
