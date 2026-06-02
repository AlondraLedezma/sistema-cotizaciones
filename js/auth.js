async function checkAuth() {
  try {
    const result = await apiCall('api/auth.php?action=check');
    if (!result.authenticated) {
      window.location.href = 'index.html';
      return null;
    }
    return result.user;
  } catch (e) {
    window.location.href = 'index.html';
    return null;
  }
}

(function () {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorDiv = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    }, 100);
  });

  function showAuthError(message) {
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.add('visible');
      const card = document.querySelector('.login-card');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
      
      setTimeout(() => errorDiv.classList.remove('visible'), 6000);
    }
  }

  function hideAuthError() {
    if (errorDiv) {
      errorDiv.classList.remove('visible');
    }
  }

  const goToRegisterBtn = document.getElementById('go-to-register');
  const goToLoginBtn = document.getElementById('go-to-login');

  if (goToRegisterBtn && goToLoginBtn && loginForm && registerForm) {
    goToRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideAuthError();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });

    goToLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideAuthError();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
  }

  const toggleLoginPass = document.getElementById('toggle-password');
  if (toggleLoginPass) {
    toggleLoginPass.addEventListener('click', () => {
      const passwordInput = document.getElementById('login-password');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleLoginPass.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        toggleLoginPass.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  }

  const toggleRegisterPass = document.getElementById('toggle-register-password');
  if (toggleRegisterPass) {
    toggleRegisterPass.addEventListener('click', () => {
      const passwordInput = document.getElementById('register-password');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleRegisterPass.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        toggleRegisterPass.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthError();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btnText = document.getElementById('login-btn-text');
      const btnSpinner = document.getElementById('login-btn-spinner');
      const loginBtn = document.getElementById('login-btn');

      if (!email || !password) {
        showAuthError('Por favor ingresa tu correo y contraseña');
        return;
      }

      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline';
      loginBtn.disabled = true;

      try {
        const result = await apiCall('api/auth.php?action=login', 'POST', { email, password });
        if (result.success) {
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        showAuthError(error.message || 'Credenciales incorrectas');
      } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        loginBtn.disabled = false;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthError();

      const nombre = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const btnText = document.getElementById('register-btn-text');
      const btnSpinner = document.getElementById('register-btn-spinner');
      const registerBtn = document.getElementById('register-btn');

      if (!nombre || !email || !password) {
        showAuthError('Por favor completa todos los campos');
        return;
      }

      if (password.length < 6) {
        showAuthError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline';
      registerBtn.disabled = true;

      try {
        const result = await apiCall('api/auth.php?action=register', 'POST', { nombre, email, password });
        if (result.success) {
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        showAuthError(error.message || 'Error al registrar usuario');
      } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        registerBtn.disabled = false;
      }
    });
  }

  if (loginForm || registerForm) {
    fetch('api/auth.php?action=check')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) window.location.href = 'dashboard.html';
      })
      .catch(() => { });
  }
})();

async function logout() {
  try {
    await apiCall('api/auth.php?action=logout', 'POST');
  } catch (e) {
  }
  window.location.href = 'index.html';
}
