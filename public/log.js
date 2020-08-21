let app = new Vue({
    el: '#stats',
    data() {
        return {
            loading: true,
            entries:null
        }
    },
    created(){
    },
    mounted: async function () {
        await this.getLog();
    },
    methods: {
        getLog:async function () {
            await axios
                .get("/log/all")
                .then(function (res) {
                    console.log(res.data);
                    app.entries = res.data;
                })
                .finally(function () {
                    app.loading = false;
                });
        }
    }
});