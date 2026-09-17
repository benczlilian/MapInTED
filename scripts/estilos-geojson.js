var geojsonConfigs = {
    "decadas": {
        cores: {
            "1980 - 1989": "#e5dfd1",
            "1990 - 1999": "#b8a275",
            "2000 - 2009": "#8a7447",
            "2010 - 2019": "#594b2e"
        },
        corBorda: "#603b00",
        pesoBorda: 0.6,
        atributosTooltip: ["nome_proje", "data_de_cr"]
    },
    "andares": {
        cores: {
            "1º Andar": "#926400",
            "2º Andar": "#783000",
            "3º Andar": "#9e0005"
        },
        opacidadePreenchimento: 0.3, 
        opacidadeBorda: 0.5,         
        //pesoBorda: 2,
        atributosTooltip: ["andar"]
    },
    "parana": {
        pesoBorda: 8
    },

    "irenoalves": {
        cores: { "NOME_PA": "#e5ede1"}, 
        opacidadePreenchimento: 0.3,
        atributosTooltip: ["NOME_PA"]
    },


    //GEODESIA-------------------
    "perimetro": {
        cores: { "Fazenda Chapadão": "#ebebeb"},
        corBorda: "#333333",
        atributosTooltip: ["PA"]
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
        atributosTooltip: ["nome_pa","TIPOB"]
    },
    "rios": {
        cores:{"Hidrografia":"#6498d2"}, 
        atributosTooltip: ["nome_pa","tipo"]
    },

    //---------------------------------------


};