Component({
  properties: {
    text: {
      type: String,
      value: ""
    },
    type: {
      type: String,
      value: "primary"
    }
  },

  methods: {
    tap() {
      this.triggerEvent("tap");
    }
  }
});
