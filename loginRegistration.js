const LoginForm = document.getElementById("login-form");
const LoginBtn = document.getElementById("login-btn");
const RegistrationForm = document.getElementById("registration-form");
const RegisterBtn = document.getElementById("register-btn");
const FormTitle = document.getElementById("form-title");

function showLoginRegistrationForm(formType) {
  if (formType === "loginForm") {
    FormTitle.innerText = "Login";
    LoginForm.style.display = "block";
    RegistrationForm.style.display = "none";

    // Add active class to Login button and remove from Register button
    LoginBtn.classList.add("active-btn");
    LoginBtn.classList.remove("inactive-btn");
    RegisterBtn.classList.add("inactive-btn");
    RegisterBtn.classList.remove("active-btn");
  } else if (formType === "registerForm") {
    FormTitle.innerText = "Register";
    LoginForm.style.display = "none";
    RegistrationForm.style.display = "block";

    // Add active class to Register button and remove from Login button
    RegisterBtn.classList.add("active-btn");
    RegisterBtn.classList.remove("inactive-btn");
    LoginBtn.classList.add("inactive-btn");
    LoginBtn.classList.remove("active-btn");
  }
}

async function loginUser() {
  // Get the values from the form inputs
  const emailField = document.getElementById("username");
  const passwordField = document.getElementById("password");

  const email = emailField.value;
  const password = passwordField.value;

  // Check if email and password are not empty
  let formIsValid = true;

  // Reset all input borders to default (in case of previous validation)
  emailField.style.border = "";
  passwordField.style.border = "";

  // Validate email field
  if (!email) {
    emailField.style.border = "1px solid red"; // Highlight empty email field with red border
    formIsValid = false;
  }

  // Validate password field
  if (!password) {
    passwordField.style.border = "1px solid red"; // Highlight empty password field with red border
    formIsValid = false;
  }

  // If any field is empty, do not proceed with the API call
  if (!formIsValid) {
    alert("Please fill out both email and password.");
    return;
  }

  // Prepare the data to be sent to the API
  const loginData = {
    username: email,
    password: password,
  };

  alert(JSON.stringify(loginData)); // Optional: Just for debugging

  try {
    // Make the API request using fetch with await
    const response = await fetch("http://45.114.245.191:8085/api/User/login", {
      method: "POST", // HTTP method
      headers: {
        "Content-Type": "application/json", // Tell the server we're sending JSON
      },
      body: JSON.stringify(loginData), // Convert the data to JSON
    });

    const data = await response.json(); // Parse the response as JSON
    console.log(data);

    if (data.message == "Welcome to Gignaati") {
      // Handle successful login
      alert("Login successful");
      document.getElementById("loyout-area").style.display = "block";
      document.getElementById("login-registration-container").style.display =
        "none";
      // Optionally, redirect or store the authentication token
      // window.location.href = 'dashboard.html'; // Example of redirect
    } else {
      // Handle failed login
      alert("Login failed: " + data.message); // Display the error message
    }
  } catch (error) {
    // Handle errors during the request
    console.error("Error:", error);
    alert("An error occurred. Please try again later.");
  }
}

async function registerUser() {
  // Get the values from the form inputs
  const fullNameField = document.getElementById("fullName");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("registraion-password");

  const fullName = fullNameField.value;
  const email = emailField.value;
  const password = passwordField.value;

  // Prepare the data to be sent to the API
  const registerData = {
    fullName: fullName,
    email: email,
    password: password,
    createdBy: 0,
  };

  // Reset all input borders to default (in case of previous validation)
  fullNameField.style.border = "";
  emailField.style.border = "";
  passwordField.style.border = "";

  // Check if fullName, email, and password are not empty
  let formIsValid = true;

  // Validate full name field
  if (!fullName) {
    fullNameField.style.border = "1px solid red"; // Highlight empty full name field with red border
    formIsValid = false;
  }

  // Validate email field
  if (!email) {
    emailField.style.border = "1px solid red"; // Highlight empty email field with red border
    formIsValid = false;
  }

  // Validate password field
  if (!password) {
    passwordField.style.border = "1px solid red"; // Highlight empty password field with red border
    formIsValid = false;
  }

  // If any field is empty, do not proceed with the API call
  if (!formIsValid) {
    alert("Please fill out all fields.");
    return;
  }

  alert(JSON.stringify(registerData)); // Optional: Just for debugging

  try {
    // Make the API request using fetch with await
    const response = await fetch(
      "http://45.114.245.191:8085/api/User/Register",
      {
        method: "POST", // HTTP method
        headers: {
          "Content-Type": "application/json", // Tell the server we're sending JSON
        },
        body: JSON.stringify(registerData), // Convert the data to JSON
      }
    );

    const data = await response.json(); // Parse the response as JSON
    console.log(data);

    if (data.message) {
      // Handle successful registration
      alert("Registration successful");
      document.getElementById("login-form").style.display = "block";
      document.getElementById("registration-form").style.display = "none";
      // Optionally, redirect or store the authentication token
      // window.location.href = 'login.html'; // Example of redirect to login page
    } else {
      // Handle failed registration
      alert("Registration failed: " + data.message); // Display the error message
    }
  } catch (error) {
    // Handle errors during the request
    console.error("Error:", error);
    alert("An error occurred. Please try again later.");
  }
}

const handleLogout = () => {
  document.getElementById("loyout-area").style.display = "none";
  document.getElementById("login-registration-container").style.display =
    "block";
};
