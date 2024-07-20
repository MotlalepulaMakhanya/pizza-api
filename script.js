document.addEventListener('alpine:init', () => {
  Alpine.data('pizzaCart', () => ({
    title: 'Pizza Cart API',
    pizzas: [],
    featuredPizzas: [],
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
          pizzas: [...this.cartPizzas],
        };
        this.saveOrderToLocalStorage(order);

        // Display the success message and clear after 9 seconds
        setTimeout(() => {
          this.cartPizzas = [];
          this.cartTotal = 0.00;
          this.showCheckout = false;
          this.message = '';
        }, 9000); 

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

    toggleOrders() {
      this.showOrders = !this.showOrders;
      if (this.showOrders) {
        this.getHistoricalOrders();
      }
    },

    saveOrderToLocalStorage(order) {
      let orders = JSON.parse(localStorage.getItem('historicalOrders')) || [];
      orders.push(order);
      localStorage.setItem('historicalOrders', JSON.stringify(orders));
    },

    getHistoricalOrders() {
      this.historicalOrders = JSON.parse(localStorage.getItem('historicalOrders')) || [];
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
    }
  }));
});

