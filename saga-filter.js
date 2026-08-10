const sagaFilterBtn = document.createElement('button');
sagaFilterBtn.type = 'button';
sagaFilterBtn.id = 'sagaFilterBtn';
sagaFilterBtn.className = 'secondary saga-filter-btn';
sagaFilterBtn.textContent = '🎬 Només primeres de saga: No';

const toolbar = document.querySelector('.toolbar');
if (toolbar) toolbar.appendChild(sagaFilterBtn);

let showOnlySagaFirst = false;

function applySagaFirstFilter() {
  const cards = document.querySelectorAll('#grid .card');
  cards.forEach(card => {
    if (!showOnlySagaFirst) {
      card.style.display = '';
      return;
    }
    const badge = card.querySelector('.series-badge');
    const isFirst = badge?.textContent.includes('1a de la saga');
    card.style.display = isFirst ? '' : 'none';
  });
}

sagaFilterBtn.addEventListener('click', () => {
  showOnlySagaFirst = !showOnlySagaFirst;
  sagaFilterBtn.textContent = showOnlySagaFirst
    ? '🎬 Només primeres de saga: Sí'
    : '🎬 Només primeres de saga: No';
  sagaFilterBtn.classList.toggle('active', showOnlySagaFirst);
  applySagaFirstFilter();
});

const sagaFilterObserver = new MutationObserver(applySagaFirstFilter);
const gridForSagaFilter = document.querySelector('#grid');
if (gridForSagaFilter) sagaFilterObserver.observe(gridForSagaFilter, { childList: true });
