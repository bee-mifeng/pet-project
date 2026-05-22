Component({
  properties: {
    title: {
      type: String,
      value: ""
    },
    buttonText: {
      type: String,
      value: ""
    }
  },

  methods: {
    tapButton() {
      this.triggerEvent("action");
    }
  }
});
