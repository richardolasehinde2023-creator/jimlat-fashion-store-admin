// ============================================
// ADMIN AUTH
// Only your friend can access this
// ============================================

// Your friend's admin email
// Change this to his real email
var ADMIN_EMAIL = 'jimlat2999@gmail.com';

var AdminAuth = {

  init() {
    auth.onAuthStateChanged(function(user) {
      var currentPage = window.location.pathname;
      var isLoginPage = currentPage.includes('index.html')
        || currentPage.endsWith('admin/')
        || currentPage.endsWith('admin');

      if (user) {
        // Check if this is the admin email
        if (user.email !== ADMIN_EMAIL) {
          // Not admin — sign out and redirect
          auth.signOut();
          window.location.href = 'index.html';
          return;
        }

        // Is admin — if on login page redirect to dashboard
        if (isLoginPage) {
          window.location.href = 'dashboard.html';
        }

        // Update admin name in UI
        var nameEls = document.querySelectorAll('.admin-name');
        nameEls.forEach(function(el) {
          el.textContent = user.displayName || user.email;
        });

      } else {
        // Not logged in — redirect to login
        if (!isLoginPage) {
          window.location.href = 'index.html';
        }
      }
    });
  },

  async login(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getError(error.code) };
    }
  },

  async logout() {
    await auth.signOut();
    window.location.href = 'index.html';
  },

  getError(code) {
    var errors = {
      'auth/user-not-found':  'Email not found',
      'auth/wrong-password':  'Incorrect password',
      'auth/invalid-email':   'Invalid email address',
      'auth/too-many-requests': 'Too many attempts. Try again later'
    };
    return errors[code] || 'Login failed. Try again.';
  }

};