
Vue.component("modal", {
    template: "#modal-template"
});
let app = new Vue({
    el: '#stats',
    data() {
        return {
            loading: true,
            tgusers:null,
            tginfo:null,

            showModal:false,
            modalData: null,
        }
    },
    created(){
    },
    mounted: async function () {
        await this.getUsers();
        await this.getTelegramInfo();
    },
    methods: {
        setUser:async function(enable){
            axios.post('/telegram/user', {
                id: this.modalData.tgId,
                enable:enable
            })
                .then(function (response) {
                    console.log(response.data);
                    let data = response.data;
                    if(data.error == true){
                        alert(data.message)
                    }else{
                        alert("saved");
                        app.showModal=false;
                        app.getUsers();
                    }
                })
                .catch(function (error) {
                    console.log(error);
                })
                .finally(() => {
                    this.showModal=false;
                })
        },
        openModal:function(user){
            app.showModal=true;
            app.modalData=user;
        },
        getTelegramInfo: async function(){
            await axios
                .get("/telegram/info")
                .then(function (res) {
                    console.log(res.data);
                    app.tginfo = res.data;
                })
                .finally(function () {
                    app.loading = false;
                });
        },
        getUsers:async function () {
            await axios
                .get("/telegram/all")
                .then(function (res) {
                    console.log(res.data);
                    app.tgusers = res.data;
                })
                .finally(function () {
                    app.loading = false;
                });
        }
    }
});