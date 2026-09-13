/**
 * MOSENC COFFEE ROASTERY — CLIENT JAVASCRIPT
 * Fully standalone Vanilla JS (no libraries required)
 * Handles mobile nav, coffee catalog filtering, interactive order inquiry modal,
 * localStorage demo storage for boss presentation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initHeaderScroll();
  initCatalogFilters();
  initOrderModal();
  initDemoOrdersViewer();
  initContactForms();
});

/* ==========================================================================
   1. MOBILE NAVIGATION
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  if (!toggleBtn || !drawer) return;

  function toggleMenu(isOpen) {
    const shouldOpen = isOpen !== undefined ? isOpen : !drawer.classList.contains('open');
    toggleBtn.classList.toggle('open', shouldOpen);
    drawer.classList.toggle('open', shouldOpen);
    toggleBtn.setAttribute('aria-expanded', shouldOpen);
    document.body.style.overflow = shouldOpen ? 'hidden' : '';
  }

  toggleBtn.addEventListener('click', () => toggleMenu());

  // Close on link click
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      toggleMenu(false);
    }
  });
}

/* ==========================================================================
   2. HEADER SCROLL EFFECT
   ========================================================================== */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 15) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ==========================================================================
   3. COFFEE CATALOG FILTERING
   ========================================================================== */
function initCatalogFilters() {
  const filterChips = document.querySelectorAll('.filter-chip');
  const productCards = document.querySelectorAll('.product-card[data-category]');
  if (!filterChips.length || !productCards.length) return;

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filterVal = chip.getAttribute('data-filter') || 'all';

      productCards.forEach(card => {
        const cardCat = card.getAttribute('data-category') || '';
        if (filterVal === 'all' || cardCat.includes(filterVal)) {
          card.style.display = '';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   4. ORDER & INQUIRY MODAL SYSTEM
   ========================================================================== */
const STORAGE_KEY = 'mosenc_demo_orders';

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    updateOrdersBadgeCount();
  } catch (e) {
    console.error('Local storage save error', e);
  }
}

function updateOrdersBadgeCount() {
  const badge = document.querySelector('.demo-orders-badge');
  if (!badge) return;
  const count = getStoredOrders().length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'grid' : 'none';
}

function initOrderModal() {
  const modalBackdrop = document.getElementById('order-modal');
  if (!modalBackdrop) return;

  const form = modalBackdrop.querySelector('#order-form');
  const closeBtn = modalBackdrop.querySelector('.modal-close-btn');
  const successState = modalBackdrop.querySelector('.modal-success-state');
  const formState = modalBackdrop.querySelector('.modal-form-state');
  const productSelect = modalBackdrop.querySelector('#order-product');
  const weightSelect = modalBackdrop.querySelector('#order-weight');
  const successOrderNum = modalBackdrop.querySelector('#success-order-num');
  const successOrderSummary = modalBackdrop.querySelector('#success-order-summary');

  function openModal(productName, defaultWeight) {
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Reset view to form
    if (formState) formState.style.display = 'block';
    if (successState) successState.classList.remove('active');

    if (productSelect && productName) {
      let matched = false;
      for (let i = 0; i < productSelect.options.length; i++) {
        if (productSelect.options[i].text.toLowerCase().includes(productName.toLowerCase()) ||
            productSelect.options[i].value.toLowerCase().includes(productName.toLowerCase())) {
          productSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && productName) {
        productSelect.value = productName;
      }
    }

    if (weightSelect && defaultWeight) {
      weightSelect.value = defaultWeight;
    }
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Attach triggers
  document.querySelectorAll('[data-open-modal="order"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const product = btn.getAttribute('data-product-name') || '';
      const weight = btn.getAttribute('data-product-weight') || '500g';
      openModal(product, weight);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
      closeModal();
    }
  });

  // Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Clear previous errors
      form.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));

      const nameInput = form.querySelector('#order-name');
      const contactInput = form.querySelector('#order-contact');
      const qtyInput = form.querySelector('#order-qty');
      const noteInput = form.querySelector('#order-note');

      let isValid = true;

      if (!nameInput.value.trim()) {
        nameInput.closest('.form-group').classList.add('has-error');
        isValid = false;
      }

      if (!contactInput.value.trim() || contactInput.value.trim().length < 5) {
        contactInput.closest('.form-group').classList.add('has-error');
        isValid = false;
      }

      if (!isValid) return;

      const orderNumber = 'MS-' + Math.floor(1000 + Math.random() * 9000);
      const selectedProduct = productSelect ? productSelect.options[productSelect.selectedIndex].text : 'Кофе Mosenc';
      const selectedWeight = weightSelect ? weightSelect.value : '500г';
      const quantity = qtyInput ? qtyInput.value : 1;

      const orderRecord = {
        id: orderNumber,
        product: selectedProduct,
        weight: selectedWeight,
        quantity: quantity,
        customerName: nameInput.value.trim(),
        contact: contactInput.value.trim(),
        note: noteInput ? noteInput.value.trim() : '',
        timestamp: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Riga' }),
        status: 'Ожидает подтверждения сотрудником'
      };

      // Save to localStorage
      const orders = getStoredOrders();
      orders.unshift(orderRecord);
      saveStoredOrders(orders);

      // Display success
      if (formState) formState.style.display = 'none';
      if (successState) successState.classList.add('active');
      if (successOrderNum) successOrderNum.textContent = orderNumber;
      if (successOrderSummary) {
        successOrderSummary.innerHTML = `<strong>${selectedProduct}</strong> (${selectedWeight}) × ${quantity} шт.<br>
        <span style="color:var(--wp--preset--color--muted);font-size:12px;">Клиент: ${nameInput.value.trim()} (${contactInput.value.trim()})</span>`;
      }

      form.reset();
    });
  }

  updateOrdersBadgeCount();
}

/* ==========================================================================
   5. DEMO ORDERS VIEWER (SHOW TO BOSS)
   ========================================================================== */
function initDemoOrdersViewer() {
  const trigger = document.querySelector('.demo-orders-trigger');
  const viewerModal = document.getElementById('demo-orders-modal');
  if (!trigger || !viewerModal) return;

  const ordersContainer = viewerModal.querySelector('#demo-orders-list');
  const closeBtn = viewerModal.querySelector('.modal-close-btn');
  const clearBtn = viewerModal.querySelector('#clear-demo-orders-btn');

  function renderOrders() {
    const orders = getStoredOrders();
    if (!ordersContainer) return;

    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--wp--preset--color--muted);">
          <p style="margin-bottom:8px;font-size:24px;">📦</p>
          <p>Пока нет тестовых заявок.<br>Оформите заявку на любой сорт кофе, чтобы проверить фиксацию.</p>
        </div>`;
      return;
    }

    ordersContainer.innerHTML = orders.map(ord => `
      <div style="background:var(--wp--preset--color--subtle); border:1px solid var(--wp--preset--color--border); border-radius:8px; padding:16px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-weight:700; color:var(--wp--preset--color--primary); font-family:var(--wp--preset--font-family--mono);">${ord.id}</span>
          <span style="font-size:12px; color:var(--wp--preset--color--light-muted);">${ord.timestamp}</span>
        </div>
        <div style="font-weight:600; margin-bottom:4px;">${ord.product} (${ord.weight}) × ${ord.quantity} шт.</div>
        <div style="font-size:13px; color:var(--wp--preset--color--muted); margin-bottom:6px;">
          Клиент: <strong>${ord.customerName}</strong> (${ord.contact})
        </div>
        ${ord.note ? `<div style="font-size:12px; color:var(--wp--preset--color--muted); font-style:italic;">«${ord.note}»</div>` : ''}
        <div style="margin-top:8px; display:inline-block; font-size:11px; padding:2px 8px; border-radius:12px; background:var(--wp--preset--color--green-subtle); color:var(--wp--preset--color--green); font-weight:600;">
          ${ord.status}
        </div>
      </div>
    `).join('');
  }

  trigger.addEventListener('click', () => {
    renderOrders();
    viewerModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      viewerModal.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  viewerModal.addEventListener('click', (e) => {
    if (e.target === viewerModal) {
      viewerModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Очистить список тестовых заявок демо?')) {
        saveStoredOrders([]);
        renderOrders();
      }
    });
  }
}

/* ==========================================================================
   6. CONTACT FORMS
   ========================================================================== */
function initContactForms() {
  document.querySelectorAll('.js-contact-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('[name="name"]');
      const contact = form.querySelector('[name="contact"]');
      const message = form.querySelector('[name="message"]');
      const service = form.querySelector('[name="service"]');

      if (!name || !contact) return;

      if (!name.value.trim() || !contact.value.trim()) {
        alert('Пожалуйста, укажите имя и телефон/email для связи.');
        return;
      }

      // Save inquiry as demo order/lead
      const orderNumber = 'REQ-' + Math.floor(1000 + Math.random() * 9000);
      const leadRecord = {
        id: orderNumber,
        product: service ? `Услуга: ${service.value}` : 'Запрос информации / Консультация',
        weight: '—',
        quantity: 1,
        customerName: name.value.trim(),
        contact: contact.value.trim(),
        note: message ? message.value.trim() : '',
        timestamp: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Riga' }),
        status: 'Ожидает ответа сотрудника'
      };

      const orders = getStoredOrders();
      orders.unshift(leadRecord);
      saveStoredOrders(orders);

      // Feedback message
      const parent = form.parentElement;
      form.style.display = 'none';
      const msgDiv = document.createElement('div');
      msgDiv.className = 'modal-info-box';
      msgDiv.style.background = 'var(--wp--preset--color--green-subtle)';
      msgDiv.style.borderLeftColor = 'var(--wp--preset--color--green)';
      msgDiv.innerHTML = `
        <h4 style="color:var(--wp--preset--color--green); margin-bottom:6px;">Заявка #${orderNumber} принята!</h4>
        <p style="margin:0; font-size:13px; color:var(--wp--preset--color--contrast);">
          Спасибо, ${name.value.trim()}! Запрос зафиксирован в демо-системе. Сотрудник Mosenc свяжется с вами в рабочее время.
        </p>
      `;
      parent.appendChild(msgDiv);
    });
  });
}
