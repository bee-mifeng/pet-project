Component({
  properties: {
    item: {
      type: Object,
      value: {}
    },
    showStatus: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    openDetail() {
      this.triggerEvent("open", { id: this.properties.item._id });
    }
  }
});
