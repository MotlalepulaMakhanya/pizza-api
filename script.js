document.addEventListener('alpine:init', () => {
  Alpine.data('pizzaCart', () => ({
      title: 'Pizza Cart API',
      pizzas: [],
      featuredPizzas: [],
      featuredPizzaId: '',
      username: localStorage.getItem('username') || '',
      usernameInput: '',
      cartId: localStorage.getItem('cartId') || '',
      paymentAmount: 0,
      message: '',
      cartPizzas: [],
      cartTotal: 0.00,
      historicalOrders: [],
      showOrders: false,
      showCheckout: false,
      isLoggedIn: !!localStorage.getItem('username'),

      login() {
          if (this.username.length > 2) {
              localStorage.setItem('username', this.username);
              this.isLoggedIn = true;
              this.createCart();
          } else {
              alert("Username too short");
          }
      },

      logout() {
          if (confirm("Do you want to logout?")) {
              localStorage.removeItem(`${this.username}_historicalOrders`);
              this.username = '';
              this.cartId = '';
              localStorage.removeItem('username');
              localStorage.removeItem('cartId');
              this.isLoggedIn = false;
          }
      },

      createCart() {
          if (this.cartId) {
              return;
          } else {
              const createCartURL = `https://pizza-api.projectcodex.net/api/pizza-cart/create?username=${this.username}`;
              return axios.get(createCartURL).then(result => {
                  this.cartId = result.data.cart_code;
                  localStorage.setItem('cartId', this.cartId);
                  this.getCart();
              });
          }
      },

      getCart() {
          const getCartURL = `https://pizza-api.projectcodex.net/api/pizza-cart/${this.cartId}/get`;
          return axios.get(getCartURL).then(response => {
              this.cartPizzas = response.data.pizzas.map(pizza => ({
                  ...pizza,
                  quantity: 1,
                  total: pizza.price
              }));
              this.calculateTotal();
          });
      },

      addPizza(pizzaId) {
          return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/add', {
              cart_code: this.cartId,
              pizza_id: pizzaId
          });
      },

      removePizza(pizzaId) {
          return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/remove', {
              cart_code: this.cartId,
              pizza_id: pizzaId
          });
      },

      pay(amount) {
          return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/pay', {
              cart_code: this.cartId,
              amount: amount
          });
      },

      payForCart() {
          if (this.paymentAmount >= this.cartTotal) {
              const change = (this.paymentAmount - this.cartTotal).toFixed(2);
              this.message = `Payment successful! Your change is R${change}.`;

              const order = {
                  id: new Date().getTime(),
                  date: new Date().toLocaleString(),
                  total: this.cartTotal,
                  pizzas: this.cartPizzas.map(pizza => ({ ...pizza }))
              };
              this.saveOrderToLocalStorage(order);

              setTimeout(() => {
                  this.cartPizzas = [];
                  this.cartTotal = 0.00;
                  this.showCheckout = false;
                  this.message = '';
              }, 5000);

          } else {
              this.message = 'Insufficient payment amount.';
          }
      },

      updatePizzaQuantity(pizzaId, quantity) {
          const pizza = this.cartPizzas.find(pizza => pizza.id === pizzaId);
          if (pizza) {
              pizza.quantity += quantity;
              if (pizza.quantity < 1) {
                  pizza.quantity = 1;
              }
              pizza.total = pizza.price * pizza.quantity;
              this.calculateTotal();
          }
      },

      calculateTotal() {
          this.cartTotal = this.cartPizzas.reduce((total, pizza) => total + pizza.total, 0).toFixed(2);
      },

      toggleCheckout() {
          this.showCheckout = !this.showCheckout;
      },

      init() {
          if (this.isLoggedIn) {
              axios.get('https://pizza-api.projectcodex.net/api/pizzas').then(response => {
                  this.pizzas = response.data.pizzas || [];
              });

              this.createCart();
          }
          this.getFeaturedPizzas();
      },

      getFeaturedPizzas() {
          const featuredPizzasURL = `https://pizza-api.projectcodex.net/api/pizzas/featured?username=${this.username}`;
          axios.get(featuredPizzasURL).then(response => {
              this.featuredPizzas = response.data.pizzas.slice(0, 3) || [];
              console.log(response);
          });
      },

      setFeaturedPizza(pizzaId) {
          return axios.post('https://pizza-api.projectcodex.net/api/pizzas/featured', {
              username: this.username,
              pizza_id: pizzaId
          }).then(() => {
              this.getFeaturedPizzas();
          });
      },
      addFeaturedPizza() {
          if (this.featuredPizzaId) {
              this.setFeaturedPizza(this.featuredPizzaId).then(() => {
                  this.featuredPizzaId = ''; // Clear input field after adding
              }).catch(error => {
                  console.error("Error adding featured pizza:", error);
              });
          } else {
              alert("Please enter a pizza ID.");
          }
      },

      toggleOrders() {
          this.showOrders = !this.showOrders;
          if (this.showOrders) {
              this.getHistoricalOrders();
          }
      },

      saveOrderToLocalStorage(order) {
          let ordersKey = `${this.username}_historicalOrders`;
          let orders = JSON.parse(localStorage.getItem(ordersKey)) || [];
          orders.push(order);
          localStorage.setItem(ordersKey, JSON.stringify(orders));
      },

      getHistoricalOrders() {
          let ordersKey = `${this.username}_historicalOrders`;
          this.historicalOrders = JSON.parse(localStorage.getItem(ordersKey)) || [];
      },

      addPizzaToCart(pizzaId) {
          this.addPizza(pizzaId).then(() => {
              const pizza = this.pizzas.find(pizza => pizza.id === pizzaId);
              const cartPizza = this.cartPizzas.find(cartPizza => cartPizza.id === pizzaId);
              if (cartPizza) {
                  cartPizza.quantity++;
                  cartPizza.total = cartPizza.price * cartPizza.quantity;
              } else {
                  this.cartPizzas.push({
                      ...pizza,
                      quantity: 1,
                      total: pizza.price
                  });
              }
              this.calculateTotal();
          });
      },

      removePizzaFromCart(pizzaId) {
          this.removePizza(pizzaId).then(() => {
              const pizza = this.cartPizzas.find(pizza => pizza.id === pizzaId);
              if (pizza) {
                  pizza.quantity--;
                  if (pizza.quantity < 1) {
                      this.cartPizzas = this.cartPizzas.filter(pizza => pizza.id !== pizzaId);
                  } else {
                      pizza.total = pizza.price * pizza.quantity;
                  }
                  this.calculateTotal();
              }
          }).catch(error => {
              console.error("Error removing pizza from cart:", error);
          });
      },

      get isCartEmpty() {
          return this.cartPizzas.length === 0;
      }
  }));
});

