// --- Helpers ---
const $ = (s, c=document) => c.querySelector(s);
const money = n => new Intl.NumberFormat('es-UY',{style:'currency',currency:'UYU'}).format(n);

// --- Estado del carrito ---
const CART_KEY = 'vali_cart';
const cart = new Map();

function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    arr.forEach(it => cart.set(it.id, it));
  }catch{}
}
function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify([...cart.values()]));
  updateCount();
}
function updateCount(){
  const count = [...cart.values()].reduce((a,it)=>a+it.qty,0);
  const badge = $('#cart-count');
  if (badge) badge.textContent = count;
}

// --- Agregar al carrito ---
function addToCart(prod){
  const id = Number(prod.id);
  const price = Number(prod.price);
  const title = String(prod.title);
  const image = String(prod.image);

  const ex = cart.get(id);
  if (ex) ex.qty += 1;
  else cart.set(id, { id, title, price, image, qty: 1 });

  saveCart();

  // Feedback sutil (sin alert)
  if (window.Swal) {
    Swal.fire({toast:true, icon:'success', title:`Agregado: ${title}`, timer:1300, showConfirmButton:false, position:'top-end'});
  }
}

// --- Render del carrito (si estamos en carrito.html) ---
function renderCartPage(){
  const rootList = $('#cart-list');
  if (!rootList) return; // no estamos en carrito.html

  rootList.innerHTML = '';
  if (cart.size === 0) {
    rootList.innerHTML = `<li class="list-group-item text-muted">Tu carrito está vacío.</li>`;
    $('#cart-subtotal').textContent = money(0);
    $('#cart-shipping').textContent = money(0);
    $('#cart-total').textContent = money(0);
    return;
  }

  let subtotal = 0;
  for (const it of cart.values()){
    subtotal += it.price * it.qty;
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center';
    li.dataset.id = it.id;
    li.innerHTML = `
      <img src="${it.image}" alt="${it.title}" class="mr-3" style="width:70px;height:70px;object-fit:cover;border-radius:6px;">
      <div class="flex-fill">
        <h6 class="mb-1">${it.title}</h6>
        <small class="text-muted d-block mb-2">${money(it.price)} c/u</small>
        <div class="mt-1 d-flex align-items-center">
          <button class="btn btn-sm btn-outline-secondary mr-2" data-dec>−</button>
          <input class="form-control form-control-sm text-center" style="width:70px" type="number" min="1" value="${it.qty}" />
          <button class="btn btn-sm btn-outline-secondary ml-2" data-inc>+</button>
          <button class="btn btn-sm btn-link text-danger ml-3" data-remove>Eliminar</button>
        </div>
      </div>
      <strong class="ml-3" data-subtotal>${money(it.price * it.qty)}</strong>
    `;
    rootList.appendChild(li);
  }

  const shipping = subtotal > 0 ? 190 : 0;
  const total = subtotal + shipping;
  $('#cart-subtotal').textContent = money(subtotal);
  $('#cart-shipping').textContent = money(shipping);
  $('#cart-total').textContent = money(total);
}

// --- Acciones en carrito.html ---
function bindCartPageEvents(){
  const list = $('#cart-list');
  if (!list) return;

  list.addEventListener('click', (e)=>{
    const li = e.target.closest('li.list-group-item');
    if (!li) return;
    const id = Number(li.dataset.id);
    const it = cart.get(id);
    if (!it) return;

    if (e.target.matches('[data-inc]')) { it.qty += 1; }
    if (e.target.matches('[data-dec]')) { it.qty = Math.max(1, it.qty - 1); }
    if (e.target.matches('[data-remove]')) { cart.delete(id); }

    saveCart(); renderCartPage();
  });

  list.addEventListener('change', (e)=>{
    if (e.target.matches('input[type="number"]')) {
      const li = e.target.closest('li.list-group-item');
      const id = Number(li.dataset.id);
      const it = cart.get(id);
      if (!it) return;
      it.qty = Math.max(1, Number(e.target.value || 1));
      saveCart(); renderCartPage();
    }
  });

  const clearBtn = $('#clear-cart');
  if (clearBtn){
    clearBtn.addEventListener('click', ()=>{
      if (window.Swal){
        Swal.fire({icon:'question', title:'Vaciar carrito', showCancelButton:true, confirmButtonText:'Vaciar'})
          .then(r => { if (r.isConfirmed){ cart.clear(); saveCart(); renderCartPage(); } });
      } else {
        cart.clear(); saveCart(); renderCartPage();
      }
    });
  }

  $('#checkout-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    if (cart.size === 0){
      window.Swal ? Swal.fire({icon:'warning',title:'Carrito vacío'}) : alert('Carrito vacío');
      return;
    }
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!data.name || !data.email){
      window.Swal ? Swal.fire({icon:'error',title:'Completá tus datos'}) : alert('Completá tus datos');
      return;
    }
    window.Swal
      ? Swal.fire({icon:'success',title:'¡Gracias por tu compra!',html:`Enviamos un comprobante a <b>${data.email}</b>.`})
      : alert('Compra realizada');
    cart.clear(); saveCart(); renderCartPage(); e.currentTarget.reset();
  });
}

// --- Init global (productos y carrito) ---
document.addEventListener('DOMContentLoaded', () => {
  loadCart(); updateCount();

  // Delegación para los botones “+” en productos.html
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-add');
    if (!btn) return;
    addToCart({
      id: btn.dataset.id,
      title: btn.dataset.title,
      price: btn.dataset.price,
      image: btn.dataset.image
    });
  });

  // Si estamos en carrito.html, render y bind
  renderCartPage();
  bindCartPageEvents();
});

// API consola opcional 
window.VALI = {
  cart: () => [...cart.values()],
  clear: () => { cart.clear(); saveCart(); renderCartPage(); },
  add: (p) => addToCart(p)
};
