function toggleContacts() {
    const btn = document.querySelector('.toggle-button');
    const menu = document.getElementById('contactOptions');
  
    btn.classList.toggle('open');
    menu.classList.toggle('show');
  
    const icon = btn.querySelector('i');
    if (btn.classList.contains('open')) {
      icon.className = 'bx bx-x';
    } else {
      icon.className = 'bx bx-user-circle';
    }
  }
  