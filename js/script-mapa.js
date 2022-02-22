/**
 * ******************************************************************
 *
 * Scripts do app de criação, gravação e exclusão de rotas
 *
 * Autores:
 * Janaina, Mariana, Pedro
 *
 * Junho/2021
 * Belo Horizonte, Brasil
 *
 * ******************************************************************
 */

/**
 *
 * Verifica a autenticação.
 *
 * Caso não exista nenhum usuário logago, o sistema volta para a tela de login
 */

// Declarando a variável que vai receber o array com a lista de usuários
var listaUsuarios;

// Checando se existe alguma lista no localstorage
if (window.localStorage.usuarios) {
    // Se sim, grava essa lista na variável acima
    listaUsuarios = JSON.parse(window.localStorage.usuarios);
} else {
    // Se não, abrir a página de login
    window.open("/index.html", "_self");
}

// Cria uma variável global chamada "usuarioLogado", que...
// ...vai receber o objeto usuário que está dentro da lista de usuários (variável listaUsuarios acima).
// Para encontrar apenas o objeto do usuário que está logado, ...
// ... usamos o método "find" para localizar esse objeto pelo login/email que...
// ...foi gravado na sessionStorage pela tela de login.
// Caso nada seja encontrado, a variável "usuarioLogado" recebe null.
window.usuarioLogado =
    listaUsuarios.find(
        (item) => item.email === window.sessionStorage.usuarioLogado
    ) || null;

// Se a variavel global "usuarioLogado" for nula, carregar a tela de login.
if (!usuarioLogado) {
    window.open("/index.html", "_self");
}

// Escreve o nome do usuário logado no botão "Para onde vamos..."
var domNome = document.querySelector("#btn-para-onde b");
domNome.textContent = usuarioLogado.nome.split(" ")[0];

/**
 *
 * Adiciona o script da API do Google Maps.
 *
 * Cria a tag script dinamicamente, para não expor a chave da API para o público.
 */
var googleMapsScript = document.createElement("script");

googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&region=BR&language=pt-BR&libraries=places&callback=initMap`;
googleMapsScript.async = true;

// Faz um append do elemento 'script' no 'head' da página
document.head.appendChild(googleMapsScript);

/**
 *
 * Variáveis globais
 *
 * São variáveis que serão usadas por várias funções diferentes.
 * Algumas variáveis são aplicadas diretamente no objeto global window, para facilitar o debug
 */
var infowindow;
var originPlaceId = "ChIJMyzPysqQpgARlznSOl55NVs";
var destinationPlaceId = null;
var destinationPlace;
var inputOri = document.querySelector("#origin-input");
window.newMarker;
var placeChangedListener;
var setRoute;
var originInput = document.getElementById("origin-input");
var destinationInput = document.getElementById("destination-input");
var favButon = document.querySelector("#favoritar");
var directionsService;
var directionsDisplay;
if (window.localStorage.usuarioLogado) {
    usuarioLogado = JSON.parse(window.localStorage.usuarioLogado);
}
var listaFavoritos = document.querySelector("ul#listaLocais");
var botaoParaOnde = document.querySelector(".para-onde");
var containerLocais = document.querySelector("#containerLocais");
var detalhesRota;

var modalFavoritos = document.querySelector(".modal-favoritos");
var modalFavoritosObj = new bootstrap.Modal(modalFavoritos, {});

var modalFavoritar = document.querySelector(".modal-favoritar");

var modalFavoritarObj = new bootstrap.Modal(modalFavoritar, {});

var montaLista;

var btnSalvarRota = modalFavoritar.querySelector("#btn-salvar");
var btnDeletaRota = modalFavoritar.querySelectorAll(".btn-deleta");

var btnDetalhesRota = document.querySelector(".btn.detalhes-rota");
var btnFavoritos = document.querySelector(".btn.favoritos");
var btnIniciarTrajeto = document.querySelector(".btn.iniciar-navegacao");
var btnEncerrarTrajeto = document.querySelector(".btn.encerrar-navegacao");
var latLngInterrupcao;

function getUniqueBy(arr, key) {
    return [...new Map(arr.map((item) => [item[key], item])).values()];
}

/**
 *
 * Função initMap
 * ********************
 *
 * Função que é chamada quando o mapa é iniciado
 */

window.initMap = function initMap() {
    // Instância do mapa grada na variável "myMap" no objeto global "window"
    window.myMap = new google.maps.Map(document.getElementById("map"), {
        mapTypeControl: false,
        center: { lat: -19.8573741, lng: -43.9108319 },
        zoom: 15.3,
    });

    // Cria uma instância para o autocomplete
    new AutocompleteDirectionsHandler(myMap);

    // Centraliza o mapa na localização atual do aparelho
    // Para isso, pega as coordenadas atuais do navegador
    navigator.geolocation.getCurrentPosition((position) =>
        // chama a função para centralizar o mapa, passando adiante as coordenadas
        centralizaMapa(position.coords)
    );

    // Função para centralizar o mapa
    function centralizaMapa(position) {
        myMap.setCenter({
            lat: position.latitude,
            lng: position.longitude,
        });

        //Instancia o mapService para pegar o PlaceID da origem
        var mapService = new google.maps.places.PlacesService(myMap);
        var request = {
            location: {
                lat: position.latitude,
                lng: position.longitude,
            },
            radius: 100,
            type: ["establishment"],
        };
        mapService.nearbySearch(request, (result) => {
            // console.log(result);
            // inputOri.value = result[1].vicinity;

            // Coloca a string "Meu local" no campo de origem
            inputOri.value = "Meu local";

            // Aplica o placeId encontrado na variavel global originPlaceId
            originPlaceId = result[1].place_id;
        });
    }
};

/**
 *
 * Função para o autocomplete
 * ********************
 *
 * Função que vai lidar com todos os eventos do componente de autocomplete
 */
function AutocompleteDirectionsHandler(map) {
    this.map = map;
    this.originPlaceId = originPlaceId;
    this.destinationPlaceId = destinationPlaceId;
    this.travelMode = "BICYCLING";

    directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer();
    this.directionsService = directionsService;
    this.directionsDisplay = directionsDisplay;
    this.directionsDisplay.setMap(map);

    var originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        fields: ["place_id", "name", "types"],
    });
    var destinationAutocomplete = new google.maps.places.Autocomplete(
        destinationInput,
        { fields: ["place_id", "name", "types"] }
    );

    this.setupPlaceChangedListener(originAutocomplete, "ORIG");
    this.setupPlaceChangedListener(destinationAutocomplete, "DEST");
}

/**
 *
 * Função para aplicar a direção após o autocomplete
 *
 */

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function (
    autocomplete,
    mode
) {
    var me = this;
    autocomplete.bindTo("bounds", this.map);
    autocomplete.addListener("place_changed", function () {
        // Guarda o objeto place na variável place
        var place = autocomplete.getPlace();

        // Verifica se o usuário escolheu algum endereço na lista de sugestões.
        // Se não, emite um alerta.
        if (!place.place_id) {
            window.alert("Selecione um dos locais na lista");
            return;
        }
        if (mode === "ORIG") {
            // Aplica o placeId encontrado na variavel global originPlaceId
            originPlaceId = place.place_id;
            me.originPlaceId = place.place_id;
            // originPlaceId = place.place_id;
        } else {
            // Aplica o placeId encontrado na variavel global destinationPlaceId
            destinationPlaceId = place.place_id;
            me.destinationPlaceId = place.place_id;
        }

        // Assim que um destino for escolhido, habilita o botão de favoritar
        favButon.disabled = false;

        // Aplica o objeto place na variável global destinationPlace
        destinationPlace = place;

        // Desenha a rota com os dados dentro da variavel me.
        me.route();
    });
};

/**
 *
 * Função para aplicar traçar a rota com base no placeId do destino
 *
 */

AutocompleteDirectionsHandler.prototype.route = function () {
    // Se não tem um placeId de origem e nem de destino, encerra a função.
    if (!originPlaceId || !this.destinationPlaceId) {
        return;
    }

    // Monta os objetos de origem e destino para inserir como parametro da função que desenha a rota
    var lugarDeOrigemPlaceId = { placeId: originPlaceId };
    var lugarDeDestinoPlaceId = { placeId: destinationPlaceId };

    // var lugarDeOrigemLatLng = {
    //     location: {
    //         lat: myMap.getCenter().lat(),
    //         lng: myMap.getCenter().lng(),
    //     },
    // };

    // alert(this.originPlaceId);
    console.log(this.destinationPlaceId);

    // Desenha a rota com os parametros de origem e destino
    this.directionsService.route(
        {
            origin: lugarDeOrigemPlaceId,
            destination: lugarDeDestinoPlaceId,
            travelMode: "BICYCLING",
        },
        function (response, status) {
            if (status === "OK") {
                directionsDisplay.setDirections(response);

                console.log(response.routes[0]);

                // Grava os detalhes da rota na variável global
                detalhesRota = response.routes[0].legs[0];

                // Escreve o endereço de origem no campo de origem
                inputOri.value = detalhesRota.start_address;

                // Habilita o botão de detalhes da rota
                btnDetalhesRota.disabled = false;

                // Simula a interrupção da navegação gravando a LatLng na variável global
                // Para isso, dividimos o numero de steps por 2 e arredodamos para cima
                // Os steps são as instruções de direção de cada rota.
                latLngInterrupcao =
                    detalhesRota.steps[
                        Math.floor(detalhesRota.steps.length / 2)
                    ].end_location;

                // Chama a função preencherDetalhes de acordo com a rota que está na variavel detalhesRota
                preencheDetalhes();
            } else {
                window.alert(
                    "A requisição para criar a rota falhou devido a: " + status
                );
            }
        }
    );
};

/**
 *
 * Tela inicial
 * **************************
 *
 * Manipula os eventos de clique e collapse para mostrar/esconder os campos...
 * ... da parte de cima do mapa.
 */

destinationInput.addEventListener("click", () => {
    destinationInput.value = "";
});

var paraOndeCollapse = new bootstrap.Collapse(botaoParaOnde, {
    toggle: false,
});
paraOndeCollapse.show();

var containerLocaisCollapse = new bootstrap.Collapse(containerLocais, {
    toggle: false,
});
containerLocaisCollapse.hide();

botaoParaOnde.querySelector("button").addEventListener("click", () => {
    containerLocaisCollapse.show();
    paraOndeCollapse.hide();
    document.querySelector("body").classList.add("form-open");
});

/**
 *
 * Função alteraDestino
 * **************************
 *
 * Recebe os parametros do novo destino e redesenha a rota.
 * Os parametros podem ser uma string com o placeId ou as coordenadas
 */
function alteraDestino(novasCoordenadas) {
    let novoDestino;

    // Verifica se o parametro é um objeto do tipo {location: {lat: xxx, lng: xxx}}
    // Se sim, usa o mesmo objeto como parametro.
    // Caso contrário, usamos o placeId
    if (typeof novasCoordenadas == "object") {
        novoDestino = novasCoordenadas;
    } else {
        novoDestino = { placeId: novasCoordenadas };
    }

    // Monta o objeto com os parametros da rota a ser criada
    var parametros = {
        origin: { placeId: originPlaceId },
        destination: novoDestino,
        travelMode: "BICYCLING",
    };

    var aplicaDirecao = function (response, status) {
        if (status === "OK") {
            // Desenha a rota em caso de sucesso
            directionsDisplay.setDirections(response);
            console.log(response);

            // Atualiza a variável global com a nova rota
            detalhesRota = response.routes[0].legs[0];

            // Habilita o botão de detalhes da rota
            btnDetalhesRota.disabled = false;

            // Atualiza o texto do campo de origem
            inputOri.value = detalhesRota.start_address;

            // Simula a interrupção da navegação gravando a LatLng na variável global
            // Para isso, dividimos o numero de steps por 2 e arredodamos para cima
            // Os steps são as instruções de direção de cada rota.
            latLngInterrupcao =
                detalhesRota.steps[Math.floor(detalhesRota.steps.length / 2)]
                    .end_location;

            // Chama a função preencherDetalhes de acordo com a rota que está na variavel detalhesRota
            preencheDetalhes();
        } else {
            window.alert(
                "A requisição para criar a rota falhou devido a: " + status
            );
        }
    };

    // Desenha a rota com os parametros de origem e destino
    directionsService.route(parametros, aplicaDirecao);
}

/**
 *
 * Fluxo de favoritar rota
 * **************************
 *
 * Abre a modal e gravar a rota com o nome personalizado
 */

favButon.addEventListener("click", () => {
    // Abre a modal
    modalFavoritarObj.show();

    // Função que é chamada assim que a modal é aberta
    modalFavoritar.addEventListener("shown.bs.modal", function () {
        console.log("modal aberta");

        // Coloca o foco no campo nome-rota
        modalFavoritar.querySelector("#nome-rota").focus();
        // Altera o valor do campo com o endereço que está no objeto detalhes da rota
        modalFavoritar.querySelector("#nome-rota").value =
            detalhesRota.end_address;
    });
});

/**
 * Pega o clique do botão Salvar na modal
 */
btnSalvarRota.addEventListener("click", () => {
    // Pega o valor que está no campo de nome da rota
    var novoNome = modalFavoritar.querySelector("#nome-rota").value;

    // adiciona o novo nome no objeto destinationPlace
    destinationPlace.novoNome = novoNome;

    // Chama a função gravar rota
    gravaRota();
    // Fecha a modal
    modalFavoritarObj.hide();
});

/**
 * Grava a rota no objeto do usuário logado
 */
function gravaRota() {
    console.log(destinationPlace);

    // Salva o novo objeto destinationPlace no array favDir do objeto usuarioLogado
    usuarioLogado.favDir.push(destinationPlace);

    // Grava no localStorage o objeto usuarioLogado já atualizado com o novo endereco
    window.localStorage.usuarioLogado = JSON.stringify(usuarioLogado);

    // Desabilita o botão de favoritar
    favButon.disabled = true;

    // Atualiza a lista de usuarios com o objeto usuarioLogado já atualizado com o novo endereco
    listaUsuarios.forEach((item) => {
        if (item.email === usuarioLogado.email) {
            // console.log(item)
            item.favDir = usuarioLogado.favDir;
        }
    });

    // Atualiza a lista de usuarios no localStorage
    window.localStorage.usuarios = JSON.stringify(listaUsuarios);

    // Chama a função montaLista
    montaLista();
}

/**
 * Função para construir a lista de locais favoritos na modal de favoritos
 *
 * A função deve ser chamada assim que for declarada
 */

(montaLista = function montaLista() {
    // Esvazia a lista existente
    listaFavoritos.innerHTML = "";

    // Desabilita o botao favoritos
    btnFavoritos.disabled = true;

    // Fecha a modal de favoritar se estiver aberta
    modalFavoritarObj.hide();

    // Verifica se existe pelo menos 1 local favoritado
    if (usuarioLogado.favDir.length > 0) {
        // Reabilita o botão favoritos
        btnFavoritos.disabled = false;

        // Para cada item na lista de favoritos do usuario logado...
        usuarioLogado.favDir.forEach((fav) => {
            // ... cria o html a seguir...
            var listaHtml = `
            <li class="list-group-item d-flex justify-content-between" id="${fav.place_id}">
                <button class="d-flex btn-rota">
                    <i class="bi bi-geo-alt me-2"></i>
                    <span class="d-inline-block text-truncate">${fav.novoNome}</span>
                </button>
                <button class="d-flex btn-deleta text-danger">
                    <i class="bi bi-x-circle"></i>
                </button>
            </li>
            `;

            // ... adiciona o html criado no elemento ul na modal...
            listaFavoritos.innerHTML += listaHtml;
            // ... chama a função escutaClick para...
            // ... adicionar eventos de clique nos botoes recem-criados
            escutaClick();
        });
    }
})();

/**
 * Função para deletar um item da lista de favoritos na modal de favoritos
 * Recebe o pladeId como parametro
 */
function deletaRota(placeId) {
    // Cria um novo array excluindo o local com o placeId informado
    var novoFavDir = usuarioLogado.favDir.filter(
        (item) => item.place_id !== placeId
    );

    // Aplica o novo array no objeto usuarioLogado
    usuarioLogado.favDir = novoFavDir;

    // Grava o nono usuario logado no localStorage
    window.localStorage.usuarioLogado = JSON.stringify(usuarioLogado);

    // Atualiza a lista de usuarios com o usuarioLogado já sem o item excluido
    listaUsuarios.forEach((item) => {
        if (item.email === usuarioLogado.email) {
            // console.log(item)
            item.favDir = usuarioLogado.favDir;
        }
    });

    // Atualiza a lista de usuarios no storage
    window.localStorage.usuarios = JSON.stringify(listaUsuarios);

    // Monta a lista novamente com base na nova lista de favoritos
    montaLista();

    // Fecha a modal caso a lista de favoritos esteja vazia
    if (novoFavDir.length === 0) {
        modalFavoritosObj.hide();
    }
}

/**
 * Função escutar os eventos de clique dos botões criados na modal de favoritos
 * São os botoes de deletar e de aplicar a rota
 */
function escutaClick() {
    var itensListaFavoritos = document.querySelectorAll("#listaLocais li");
    btnDeletaRota = document.querySelectorAll(".btn-deleta");

    // Adiciona o evento de clique em cada botao dentro da lista de favoritos
    itensListaFavoritos.forEach((item) => {
        item.querySelector("button.btn-rota").addEventListener(
            "click",
            (evento) => {
                // Altera o destino da rota com base no id do <li>
                alteraDestino(item.id);
                // Fecha a modal
                modalFavoritosObj.hide();
            }
        );
    });

    // Para cada botao de deletar rota...
    btnDeletaRota.forEach((btn) => {
        // Escucar o evento de clique
        btn.addEventListener("click", () => {
            // Pega o id do elemento pai, no caso o <li>
            let placeIdToRemove = btn.parentNode.id;

            //Chama a funçao deletaRota passando o ID acima
            deletaRota(placeIdToRemove);
        });
    });
}

/**
 *
 * Fluxo de mostrar os detalhes da rota atual
 * **************************
 *
 * Abre a modal e atualiza os detalhes como Duração, Distãncia e Calorias
 */

/**
 * Função para preencher os detalhes
 */
function preencheDetalhes() {
    // Seleciona os elementos dentro da lista e atualiza o texto...
    // ...com base nos dados gravados na variavel detalhesRota
    var listaDetalhes = document.querySelector("#listaDetalhes");
    listaDetalhes.querySelector("#duracao b").textContent =
        detalhesRota.duration.text;
    listaDetalhes.querySelector("#distancia b").textContent =
        detalhesRota.distance.text;
    listaDetalhes.querySelector("#calorias b").textContent =
        calculaCalorias() + " Kcal";

    // Habilitar o botao e as funções para iniciar o trajeto
    habilitaIniciarTrajeto();
}

/**
 * Função para calcular as calorias
 */
function calculaCalorias() {
    // Formula:
    // 0,049 x (Seu peso x 2,2) x Total de minutos de prática = Calorias queimadas.

    // Constantes da fórmula
    const multiplicadorGeral = 0.049;
    const multiplicadorPeso = 2.2;

    // Pega o peso do usuario logado ou aplica 60 como padrão
    let peso = usuarioLogado.peso || 60;

    // Pega a duração em segundos e divide por 60 para transformar em minutos
    let duracao = detalhesRota.duration.value / 60;

    // Retorna o valor do cálculo arredondado
    return Math.round(peso * multiplicadorPeso * multiplicadorGeral * duracao);
}

/**
 *
 * Fluxo de iniciar e encerrar trajeto
 * **************************
 *
 * Atualiza estilos do mapa e da interface como um todo
 */

function habilitaIniciarTrajeto() {
    // Espera 2 segundos para habilitar o botão
    setTimeout(() => {
        btnIniciarTrajeto.disabled = false;
    }, 2000);

    // Assim que clicar no botão iniciar trajeto...
    btnIniciarTrajeto.addEventListener("click", () => {
        // Atualiza as classes para aplicar o estilo do mapa em tela cheia
        document.querySelector("body").classList.add("nav-open");
        btnDetalhesRota.classList.add("hide");
        btnFavoritos.classList.add("hide");

        // Re-centraliza o mapa no ponto inicial da rota
        myMap.setCenter({
            lat: detalhesRota.start_location.lat(),
            lng: detalhesRota.start_location.lng(),
        });

        // Aplica o zoom mais alto possível
        myMap.setZoom(22);

        // Espera 1 segundo para...
        setTimeout(() => {
            // ...desabilitar o botao iniciar trajeto e...
            btnIniciarTrajeto.disabled = true;
            // ... habilitar o botao encerrar trajeto
            btnEncerrarTrajeto.disabled = false;
        }, 1000);
    });
}

/**
 *
 * Encerrar trajeto
 */
btnEncerrarTrajeto.addEventListener("click", () => {
    // Altera o destino com base nas coordenadas gravadas na variavel latLngInterrupcao
    alteraDestino({
        lat: latLngInterrupcao.lat(),
        lng: latLngInterrupcao.lng(),
    });

    // Atualiza as classes para retirar o estilo do mapa em tela cheia
    document.querySelector("body").classList.remove("nav-open");
    btnEncerrarTrajeto.disabled = true;
    btnDetalhesRota.classList.remove("hide");
    btnFavoritos.classList.remove("hide");
});
