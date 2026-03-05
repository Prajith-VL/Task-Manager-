(function setGreetingName() {
  const greeting = document.getElementById("greetingName");
  if (!greeting) return;

  const savedName = localStorage.getItem("todo_display_name");
  if (savedName) {
    greeting.textContent = savedName;
    return;
  }

  const promptName = prompt("What should I call you?", "John");
  const cleanName = (promptName || "John").trim().slice(0, 30) || "John";
  greeting.textContent = cleanName;
  localStorage.setItem("todo_display_name", cleanName);
})();
