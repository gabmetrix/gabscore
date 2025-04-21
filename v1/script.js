function startInnings() {
    const team1 = document.getElementById("team1").value.trim();
    const team2 = document.getElementById("team2").value.trim();
    const tossWinner = document.getElementById("tossWinner").value;
    const tossDecision = document.getElementById("tossDecision").value;
  
    if (!team1 || !team2 || !tossWinner || !tossDecision) {
      alert("Please fill in all fields.");
      return;
    }
  
    const battingTeam = tossWinner === team1 && tossDecision === "bat" ? team1 : team2;
    const bowlingTeam = battingTeam === team1 ? team2 : team1;
  
    alert(`${battingTeam} will bat first.`);
  
    // Continue with further setup or logic for match start
  }
  function updateTossOptions() {
    const t1 = document.getElementById("team1").value.trim();
    const t2 = document.getElementById("team2").value.trim();
    const tossDropdown = document.getElementById("tossWinner");
  
    // Reset options
    tossDropdown.innerHTML = '<option value="" disabled selected>Select Toss Winner</option>';
  
    // Only populate if both teams are entered
    if (t1 && t2) {
      const opt1 = document.createElement("option");
      opt1.value = t1;
      opt1.textContent = t1;
  
      const opt2 = document.createElement("option");
      opt2.value = t2;
      opt2.textContent = t2;
  
      tossDropdown.appendChild(opt1);
      tossDropdown.appendChild(opt2);
    }
  }
  
  // Attach event listeners after DOM loads
  window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("team1").addEventListener("input", updateTossOptions);
    document.getElementById("team2").addEventListener("input", updateTossOptions);
  });