let app = new Vue({
    el: '#stats',
    data() {
        return {
        }
    },
    created(){
    },
    mounted: async function () {
        this.checkLogin();
    },
    methods: {
        checkLogin:async function(){

            try{
                await axios.get("/index.html")
            }catch(e){
                setTimeout(this.checkLogin,100);
                return;
            }

            location.reload();
        },
    }
});