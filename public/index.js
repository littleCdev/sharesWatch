Vue.component("modal", {
    template: "#modal-template"
});
let app = new Vue({
    el: '#stats',
    data() {
        return {
            loading: true,
            shares: null,
            currentUrl:null,
            showModal:false,
            modalData:null,
            // modal
            selected:{value:'gt'},
            limit:1
        }
    },
    created(){
        this.selected = {value:'gt'};
    },
    mounted: function () {
        this.getShares();
    },
    methods: {
        openModal:function(share){
            app.modalData=share;
            app.selected = {value:share.alarm};
            app.limit = share.alarmlimit;
            app.showModal=true;
            console.log(share);
        },
        saveShare:async function(){
            let share = app.modalData;
            console.log(`url: ${share.ID} ${share.name}`);
            axios.post('/api/alarm', {
                id: share.ID,
                type:app.selected.value,
                limit:app.limit
            })
                .then(function (response) {
                    console.log(response.data);
                    let data = response.data;
                    if(data.error == true){
                        alert(data.message)
                    }else{
                        alert("saved");
                        showModal=false;
                        app.getShares();
                    }
                })
                .catch(function (error) {
                    console.log(error);
                })
                .finally(() => {
                    this.showModal=false;
                })
        },
        deleteShare:async function(){
            let share = app.modalData;
            console.log(`url: ${share.ID} ${share.name}`);
            axios.post('/api/delete', {
                id: share.ID
            })
                .then(function (response) {
                    console.log(response.data);
                    let data = response.data;
                    if(data.error == true){
                        alert(data.message)
                    }else{
                        alert("deleted");
                        app.getShares();
                    }
                })
                .catch(function (error) {
                    console.log(error);
                })
                .finally(() => {
                    this.showModal=false;
                })
        },
        createNew: async function () {
            console.log(`url: ${this.currentUrl}`);
            axios.post('/api/new', {
                url: this.currentUrl
            })
                .then(function (response) {
                    console.log(response.data);
                    let data = response.data;
                    if(data.error == true){
                        alert(data.message)
                    }else{
                        alert("added");
                        app.currentUrl="";
                        app.getShares();
                    }
                })
                .catch(function (error) {
                    console.log(error);
                })
                .finally(() => {
                })
        },
        getShares: async function () {
            await axios
                .get("/api/all")
                .then(function (res) {
                    app.shares = res.data;
                })
                .finally(function () {
                    app.loading = false;
                });

        },
    }
});

