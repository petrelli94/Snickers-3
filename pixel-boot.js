'use strict';
// Load complete art before the first menu render, including on a cold mobile visit.
(async () => {
  const notice=document.getElementById('assetLoading');
  try {
    await window.PixelStudio?.ready;
    const script=document.createElement('script');script.src='game.js?rev=stambouli34';
    script.onload=()=>notice?.remove();
    script.onerror=()=>{if(notice)notice.textContent='Das Spiel konnte nicht geladen werden. Bitte lade die Seite neu.';};
    document.body.appendChild(script);
  } catch(error) { if(notice)notice.textContent='Beim Laden ist ein Fehler aufgetreten. Bitte lade die Seite neu.';console.error(error); }
})();
