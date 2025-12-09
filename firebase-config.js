<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBIG0qp7QJt7S4dvwMHpuqsjyJ7kkyR64A",
    authDomain: "hortingg.firebaseapp.com",
    databaseURL: "https://hortingg-default-rtdb.firebaseio.com",
    projectId: "hortingg",
    storageBucket: "hortingg.firebasestorage.app",
    messagingSenderId: "374849935944",
    appId: "1:374849935944:web:6fb3266c2c3eb099af167d",
    measurementId: "G-RK4SP2RZWE"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
