(() => {
  const back = document.querySelector('.reader-back');
  try {
    const previous = new URL(sessionStorage.getItem('research-board-return') || '', location.href);
    const home = new URL(back.href, location.href);
    if (previous.origin === home.origin && previous.pathname === home.pathname) back.href = previous.href;
  } catch { /* Use the normal board link when no previous search is available. */ }
  let timer;
  document.querySelector('.copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      const toast = document.getElementById('toast');
      toast.textContent = '자료 링크를 복사했습니다.';
      toast.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => { toast.hidden = true; }, 2600);
    } catch { window.prompt('이 주소를 복사해 공유하세요.', location.href); }
  });
})();
