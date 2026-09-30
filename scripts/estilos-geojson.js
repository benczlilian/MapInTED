var geojsonConfigs = {
    "decadas": {
        cores: {
            "1980 - 1989": "#FFF5C8",
            "1990 - 1999": "#BFB793",
            "2000 - 2009": "#807543",
            "2010 - 2019": "#403711"
        },
        corBorda: "#603b00",
        pesoBorda: 0.6,
        atributosTooltip: ["nome_proje", "data_de_cr"]
    },
    "andares": {
        cores: {
            "1º Andar": "#E5C154",
            "2º Andar": "#C54E45",
            "3º Andar": "#32606E"
        },
        opacidadePreenchimento: 0.4,
        opacidadeBorda: 0.6, 
        //pesoBorda: 2,
        atributosTooltip: ["andar"]
    },
    "parana": {
        pesoBorda: 8
    },

    "irenoalves": {
        cores: { "NOME_PA": "#e5ede1"}, 
        opacidadePreenchimento: 0.3,
        atributosTooltip: ["NOME_PA"],
        pesoBorda: 3,
    },


    //GEODESIA-------------------
    "perimetro": {
        cores: { "Fazenda Chapadão": "#ebebeb"},
        corBorda: "#333333",
        atributosTooltip: ["PA"],
        opacidadePreenchimento:0.0
    },
    "estradas": {
        cores: {"Estrada": "#c43c39"},
        atributosTooltip: ["nome_pa","tipo"]
    },  
       "marcos": {
        cores: {"Marco": "#ffffff"},  
        corBorda: "#333333",
        tamanhoPonto: 3,
        atributosTooltip: ["nome_pa","tipo"]
    }, 
    "parcelas": {
        cores: {
            "Parcelas": "#f7f7f7",
            "Reserva Legal": "#4daf4a"
        },
        corBorda: "#333333",
        atributosTooltip: ["nome_pa","TIPOB"],
        opacidadePreenchimento:0.3
    },
    "rios": {
        cores:{"Hidrografia":"#6498d2"}, 
        atributosTooltip: ["nome_pa","tipo"]
    },

    //---------------------------------------


};