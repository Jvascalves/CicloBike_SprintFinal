var listaUsuarios = window.localStorage.usuarios ? JSON.parse(window.localStorage.usuarios) : [];
window.usuarioLogado = null;
window.sessionStorage.usuarioLogado = '';
window.localStorage.setItem('usuarioLogado', '');


window.addEventListener("load", function () {

    let formulario = document.querySelector("#login");

    let campoLogin = document.querySelector("#nomelog");
    let campoSenha = document.querySelector("#senhalog");

    let erroTemplate = document.createElement('div');
    erroTemplate.classList.add('w-100')
    campoSenha.parentNode.appendChild(erroTemplate);
    
    formulario.onsubmit = (evento)=> {
        evento.preventDefault()
        let senha = campoSenha.value;
        let login = campoLogin.value;
        console.log('submeter')

       

        let usuarioRegistrado = listaUsuarios.find((item)=>item.email === login) || null;

        if (usuarioRegistrado && usuarioRegistrado.senha === senha) {
            console.log('ok');
            usuarioLogado = usuarioRegistrado;
            window.sessionStorage.usuarioLogado = login;
            window.localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado))
            window.open("/mapa.html","_self")
        } else {
            
            erroTemplate.innerHTML = '<small class="text-danger">Login ou senha incorretos<small>';
        }

        



    }

})