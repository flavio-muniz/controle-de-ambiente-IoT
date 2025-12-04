# 🌡️ Sistema de Controle Ambiental IoT

> ## ESP32 → MQTT → Raspberry Pi (Mosquitto + Node-RED) → Dashboard / Google Sheets
> **Dashboard Público:** [Acessar Painel Web](https://paineldecontroleambiental.netlify.app/)

![License](https://img.shields.io/badge/License-MIT-green)
[![Netlify Status](https://img.shields.io/website?url=https%3A%2F%2Fpaineldecontroleambiental.netlify.app%2F&label=Frontend%20Netlify&up_message=Online&down_message=Offline)](https://paineldecontroleambiental.netlify.app/)
![ESP32](https://img.shields.io/badge/Hardware-ESP32-red)
![Raspberry Pi](https://img.shields.io/badge/Server-Raspberry%20Pi-C51A4A)
![Node-RED](https://img.shields.io/badge/Backend-Node--RED-8F0000)
![MQTT](https://img.shields.io/badge/Protocol-MQTT-660066)
![Google Sheets](https://img.shields.io/badge/Cloud-Google%20Sheets-34A853)


Este repositório contém um sistema IoT completo usando **ESP32**, **Mosquitto MQTT**, **Node-RED**, **Dashboard Web**, 
e geração automática de **relatórios mensais no Google Sheets** via Apps Script.

O projeto lê **temperatura**, **umidade** e **luminosidade**, envia para uma **Raspberry Pi**, e exibe tudo em tempo real.

---


## 📡 Arquitetura Geral

O **ESP32** lê **DHT11** (temperatura/umidade) e um **LDR** (luminosidade) e publica JSON no tópico MQTT ```projeto/iot/telemetry```.
A Raspberry Pi roda o broker Mosquitto (porta 1883) e o Node-RED. Node-RED subscreve o tópico MQTT, converte o payload JSON em objeto JS,
formata mensagens para os widgets (chart/gauge) do Dashboard e grava/encaminha dados quando necessário (ex.: para Google Sheets via Apps Script ou para InfluxDB/Grafana).


```
ESP32 (DHT11 + LDR) 
        ↓ JSON (MQTT)
Mosquitto Broker (Raspberry Pi)
        ↓ Node-RED
   → Dashboard Web (/ui)
   → Exportação / Integração
        ↓
Google Forms → Google Sheets → Apps Script (Relatório mensal)
```


Tópico MQTT utilizado:
```
projeto/iot/telemetry
```
Exemplo de payload enviado pelo ESP32:
```
{
  "temperature": 22.5,
  "humidity": 91,
  "light_raw": 3143,
  "light_pct": 76,
  "timestamp": 1761252
}
```

## ⚙️ Robustez e Lógica de Conexão

Este projeto implementa mecanismos de **alta disponibilidade** no firmware do ESP32 para garantir que o monitoramento não pare em caso de instabilidade da rede:

* **Failover de Rede Inteligente:** O sistema não verifica apenas a conexão Wi-Fi. A função `connectWiFiandMQTT()` valida a conectividade ponta-a-ponta. Se o ESP32 conectar ao Wi-Fi mas não conseguir alcançar o Broker MQTT (ex: firewall bloqueando ou broker offline), ele automaticamente desconecta e tenta a próxima rede da lista de redundância (`wifiList`).
* **Resolução de Nomes (mDNS):** Utilização do hostname `raspberrypi.local` em vez de IPs estáticos. Isso facilita a conexão automática ("Plug & Play") sem necessidade de configurar IPs fixos na rede.
* **Monitoramento Visual Contínuo:** O dashboard foi projetado para exibir o fluxo de dados em tempo real. A interrupção na atualização dos gráficos serve como indicador visual imediato de latência ou desconexão dos sensores.

## 🛠️ Hardware Utilizado

* **ESP32 NodeMCU (38 pinos)**

* **Sensor DHT11** — leitura de temperatura e umidade

* **Sensor fotoresistor LDR5525** — leitura de luminosidade

* **Resistor 10kΩ** — divisor de tensão do LDR

* **Raspberry Pi 3 Model B+** — broker MQTT + Node-RED + dashboard

* Fonte 5V para Raspberry

* Cabo micro-USB para programação do ESP32


## 🔌 Wiring (Conexões)

### DHT11
```
VCC  → 3.3V  
GND  → GND  
DATA → GPIO4 (ESP32)
```

### LDR5525

Divisor resistivo:
```
3.3V ─ 10kΩ ─ GPIO34 ─ LDR ─ GND
```

## 🧰 Software / Stack Utilizada

### No ESP32

* PlatformIO + Arduino framework
* Bibliotecas:
  * PubSubClient
  * ArduinoJson (v7+)
  * DHT sensor library
* Comunicação via MQTT com JSON

### Na Raspberry Pi
* Mosquitto (broker MQTT)
* Node-RED
* node-red-dashboard

### No Google

* Google Forms
* Google Sheets
* Google Apps Script (relatório automático mensal)

## 🐧 Configuração da Raspberry Pi
### 1) Atualizar sistema
```
sudo apt update && sudo apt upgrade -y
```
### 2) Instalar Mosquitto
```
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```
Verificar:
```
sudo systemctl status mosquitto --no-pager
sudo ss -tlnp | grep 1883
```
Arquivo /etc/mosquitto/mosquitto.conf:
```
listener 1883
allow_anonymous true
```
Reiniciar o Mosquitto:
```
sudo systemctl restart mosquitto
```
Testar recepção:
```
mosquitto_sub -t 'projeto/iot/telemetry' -v
```
### 3) Instalar Node-RED
```
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
```

Instalar o dashboard:
```
cd ~/.node-red
npm install node-red-dashboard
node-red-restart
```

Acessar:

* **Editor:** ```http://<IP_DA_RASPBERRY>:1880```

* **Dashboard:** ```http://<IP_DA_RASPBERRY>:1880/ui```

### Importar Flow
* Vá em Node-RED → menu → Import → Clipboard → cole o JSON abaixo → Import → Deploy.

<details>
  <summary><b>Clique aqui para expandir o JSON do Flow</b></summary>
  
```
[
    {
        "id": "8a068f3cf02142c3",
        "type": "tab",
        "label": "Flow 1",
        "disabled": false,
        "info": "",
        "env": []
    },
    {
        "id": "ed33f27d7772bf27",
        "type": "mqtt in",
        "z": "8a068f3cf02142c3",
        "name": "",
        "topic": "#",
        "qos": "2",
        "datatype": "auto-detect",
        "broker": "af1297356f31c27e",
        "nl": false,
        "rap": true,
        "rh": 0,
        "inputs": 0,
        "x": 90,
        "y": 520,
        "wires": [
            [
                "74e5eb4601c6f65f"
            ]
        ]
    },
    {
        "id": "74e5eb4601c6f65f",
        "type": "debug",
        "z": "8a068f3cf02142c3",
        "name": "debug 1",
        "active": false,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "statusVal": "",
        "statusType": "auto",
        "x": 260,
        "y": 540,
        "wires": []
    },
    {
        "id": "8a9803c26ed52a07",
        "type": "mqtt in",
        "z": "8a068f3cf02142c3",
        "name": "",
        "topic": "projeto/iot/telemetry",
        "qos": "0",
        "datatype": "auto-detect",
        "broker": "9a0183d5798f542a",
        "nl": false,
        "rap": true,
        "rh": 0,
        "inputs": 0,
        "x": 130,
        "y": 140,
        "wires": [
            [
                "940548f65b9a86a1"
            ]
        ]
    },
    {
        "id": "940548f65b9a86a1",
        "type": "json",
        "z": "8a068f3cf02142c3",
        "name": "",
        "property": "payload",
        "action": "obj",
        "pretty": false,
        "x": 130,
        "y": 260,
        "wires": [
            [
                "68e6a179d48bca93",
                "bb0e0a5c9f890870"
            ]
        ]
    },
    {
        "id": "68e6a179d48bca93",
        "type": "function",
        "z": "8a068f3cf02142c3",
        "name": "format_for_dashboard",
        "func": "let p = msg.payload || {};\nlet t = Number(p.temperature);\nlet h = Number(p.humidity);\nlet lraw = Number(p.light_raw);\nlet lpct = Number(p.light_pct);\n\nlet m1 = { payload: t, topic: \"temperature\" };\nlet m2 = { payload: h, topic: \"humidity\" };\nlet m3 = { payload: lpct, topic: \"light_pct\" };\nreturn [m1, m2, m3];",
        "outputs": 3,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 320,
        "y": 240,
        "wires": [
            [
                "61cf23d92b0cc32f"
            ],
            [
                "b2f07ea36aa2e996"
            ],
            [
                "96bb418fba55a69d"
            ]
        ]
    },
    {
        "id": "b2f07ea36aa2e996",
        "type": "ui_chart",
        "z": "8a068f3cf02142c3",
        "name": "umidade",
        "group": "c7318e5ed89b8844",
        "order": 2,
        "width": 0,
        "height": 0,
        "label": "Umidade",
        "chartType": "line",
        "legend": "false",
        "xformat": "HH:mm:ss",
        "interpolate": "linear",
        "nodata": "",
        "dot": false,
        "ymin": "",
        "ymax": "",
        "removeOlder": 1,
        "removeOlderPoints": "",
        "removeOlderUnit": "3600",
        "cutout": 0,
        "useOneColor": false,
        "useUTC": false,
        "colors": [
            "#1f77b4",
            "#aec7e8",
            "#ff7f0e",
            "#2ca02c",
            "#98df8a",
            "#d62728",
            "#ff9896",
            "#9467bd",
            "#c5b0d5"
        ],
        "outputs": 1,
        "useDifferentColor": false,
        "className": "",
        "x": 540,
        "y": 240,
        "wires": [
            []
        ]
    },
    {
        "id": "96bb418fba55a69d",
        "type": "ui_gauge",
        "z": "8a068f3cf02142c3",
        "name": "luminosidade",
        "group": "c7318e5ed89b8844",
        "order": 0,
        "width": 0,
        "height": 0,
        "gtype": "gage",
        "title": "Luminosidade",
        "label": "%",
        "format": "{{value}}",
        "min": 0,
        "max": "100",
        "colors": [
            "#00b500",
            "#e6e600",
            "#ca3838"
        ],
        "seg1": "",
        "seg2": "",
        "diff": false,
        "className": "",
        "x": 530,
        "y": 320,
        "wires": []
    },
    {
        "id": "bb0e0a5c9f890870",
        "type": "debug",
        "z": "8a068f3cf02142c3",
        "name": "debug 2",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "statusVal": "",
        "statusType": "auto",
        "x": 200,
        "y": 360,
        "wires": []
    },
    {
        "id": "61cf23d92b0cc32f",
        "type": "ui_chart",
        "z": "8a068f3cf02142c3",
        "name": "Temperatura",
        "group": "c7318e5ed89b8844",
        "order": 0,
        "width": 0,
        "height": 0,
        "label": "Temperatura (ºC)",
        "chartType": "line",
        "legend": "false",
        "xformat": "HH:mm:ss",
        "interpolate": "linear",
        "nodata": "",
        "dot": false,
        "ymin": "",
        "ymax": "",
        "removeOlder": 1,
        "removeOlderPoints": "",
        "removeOlderUnit": "3600",
        "cutout": 0,
        "useOneColor": false,
        "useUTC": false,
        "colors": [
            "#1f77b4",
            "#aec7e8",
            "#ff7f0e",
            "#2ca02c",
            "#98df8a",
            "#d62728",
            "#ff9896",
            "#9467bd",
            "#c5b0d5"
        ],
        "outputs": 1,
        "useDifferentColor": false,
        "className": "",
        "x": 530,
        "y": 180,
        "wires": [
            []
        ]
    },
    {
        "id": "af1297356f31c27e",
        "type": "mqtt-broker",
        "name": "",
        "broker": "127.0.0.1",
        "port": 1883,
        "clientid": "",
        "autoConnect": true,
        "usetls": false,
        "protocolVersion": 4,
        "keepalive": 60,
        "cleansession": true,
        "autoUnsubscribe": true,
        "birthTopic": "",
        "birthQos": "0",
        "birthRetain": "false",
        "birthPayload": "",
        "birthMsg": {},
        "closeTopic": "",
        "closeQos": "0",
        "closeRetain": "false",
        "closePayload": "",
        "closeMsg": {},
        "willTopic": "",
        "willQos": "0",
        "willRetain": "false",
        "willPayload": "",
        "willMsg": {},
        "userProps": "",
        "sessionExpiry": ""
    },
    {
        "id": "9a0183d5798f542a",
        "type": "mqtt-broker",
        "name": "",
        "broker": "localhost",
        "port": 1883,
        "clientid": "",
        "autoConnect": true,
        "usetls": false,
        "protocolVersion": 4,
        "keepalive": 60,
        "cleansession": true,
        "autoUnsubscribe": true,
        "birthTopic": "",
        "birthQos": "0",
        "birthRetain": "false",
        "birthPayload": "",
        "birthMsg": {},
        "closeTopic": "",
        "closeQos": "0",
        "closeRetain": "false",
        "closePayload": "",
        "closeMsg": {},
        "willTopic": "",
        "willQos": "0",
        "willRetain": "false",
        "willPayload": "",
        "willMsg": {},
        "userProps": "",
        "sessionExpiry": ""
    },
    {
        "id": "c7318e5ed89b8844",
        "type": "ui_group",
        "name": "Medições",
        "tab": "daf8a973425c64b2",
        "order": 2,
        "disp": true,
        "width": 6,
        "collapse": false,
        "className": ""
    },
    {
        "id": "daf8a973425c64b2",
        "type": "ui_tab",
        "name": "Projeto IoT",
        "icon": "dashboard",
        "order": 1,
        "disabled": false,
        "hidden": false
    },
    {
        "id": "fefb8ff3151b10cd",
        "type": "global-config",
        "env": [],
        "modules": {
            "node-red-dashboard": "3.6.6"
        }
    }
]

  
```

</details>

### Principais nós e funções
* ```mqtt in``` — subscreve ```projeto/iot/telemetry``` no broker local (```127.0.0.1:1883```)
* ```json``` — converte string JSON em objeto JS (```msg.payload```)
* ```function format_for_dashboard``` — normaliza valores e cria mensagens:
  * saída 1: ```{payload: {x: now, y: temperatura}}``` → ```ui_chart``` temperatura
  * saída 2: ```{payload: {x: now, y: umidade}}``` → ```ui_chart``` umidade
  * saída 3: ```{payload: luminosidade}``` → ```ui_gauge``` luminosidade



### Importante — Dashboard tabs/groups

* Se ao importar aparecerem nós ```[unassigned]```, crie a **Tab** (ex: ```Projeto IoT```) e **Group** (ex: ```Medições```) em Menu → Dashboard → Layout, ou associe manualmente cada nó ao group criado.

## 🐍 Script Python (Bridge MQTT → Google Forms)

Caso opte por enviar os dados para o Google Sheets via script Python (ao invés do Node-RED), utilize o script abaixo. Ele atua como uma ponte, escutando o MQTT e realizando um POST HTTPS seguro para o Google Forms.

### 1) Instalar dependências
No terminal da Raspberry Pi:
```bash
sudo apt install python3-pip
sudo pip3 install paho-mqtt requests --break-system-packages
```
### 2) Criar o script logger.py
Crie o arquivo em ```/home/pi/logger.py```:
<details>
  <summary><b>Clique aqui para expandir o código do "logger.py" </b></summary>

```
import paho.mqtt.client as mqtt
import json
import requests
import time

# --- CONFIGURAÇÕES ---
MQTT_BROKER = "localhost"
MQTT_TOPIC = "projeto/iot/telemetry"

# URL do Google Forms (trocar 'viewform' por 'formResponse')
FORM_URL = "[https://docs.google.com/forms/d/e/SEU_ID_DO_FORM_AQUI/formResponse]"

# Mapeamento: Campos do JSON -> Entry IDs do Google Forms
FORM_FIELDS = {
    "temperature": "entry.SEU_ID_TEMP",
    "humidity":    "entry.SEU_ID_UMID",
    "light_pct":   "entry.SEU_ID_LUZ"
}

def enviar_para_google(data):
    try:
        form_data = {}
        # Preenche os campos do formulário
        if 'temperature' in data:
            form_data[FORM_FIELDS['temperature']] = str(data['temperature']).replace('.', ',')
        if 'humidity' in data:
            form_data[FORM_FIELDS['humidity']] = str(data['humidity']).replace('.', ',')
        if 'light_pct' in data:
            form_data[FORM_FIELDS['light_pct']] = str(data['light_pct'])

        # Envia a requisição POST
        response = requests.post(FORM_URL, data=form_data, timeout=5)
        
        if response.status_code == 200:
            print(f"✅ Dados salvos: {data}")
        else:
            print(f"❌ Erro Google: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Erro de conexão: {e}")

# --- CALLBACKS MQTT ---
def on_connect(client, userdata, flags, rc):
    print(f"Conectado ao Broker (rc={rc})")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        data = json.loads(payload)
        enviar_para_google(data)
    except Exception as e:
        print(f"Erro no parse: {e}")

# --- LOOP PRINCIPAL ---
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(MQTT_BROKER, 1883, 60)
client.loop_forever()
```
</details>

### 3) Configurar inicialização automática (Systemd)
Para que o script rode sozinho ao ligar a Raspberry Pi, criamos um serviço:

Arquivo ```/etc/systemd/system/iot-logger.service```:
```
[Unit]
Description=Logger IoT MQTT para Google Sheets
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 -u /home/pi/logger.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
Ativar o serviço:
```
sudo systemctl daemon-reload
sudo systemctl enable iot-logger.service
sudo systemctl start iot-logger.service
```
Verifique se funcionou:
```
sudo systemctl status iot-logger.service
```

## 📟 Código do ESP32 (PlatformIO)
### platformio.ini
```
[env:nodemcu-32s]
platform = espressif32
board = nodemcu-32s
framework = arduino
monitor_speed = 115200
upload_speed = 921600

lib_deps =
  knolleary/PubSubClient@^2.8
  bblanchon/ArduinoJson@^7.4.2
  adafruit/DHT sensor library@^1.4.6
```
### main.cpp

<details>
  <summary><b>Clique aqui para expandir o código "main.cpp" </b></summary>
  
```
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// ============ PINAGEM ============
#define DHTPIN 4
#define DHTTYPE DHT11
#define LDR_PIN 34

// ============ CREDENCIAIS WIFI ============
struct WifiCred {
  const char* ssid;
  const char* pass;
};

// Adicione suas redes aqui (Redundância)
WifiCred wifiList[] = {
  { "nome_da_rede_principal", "senha_principal" }, 
  { "nome_do_hotspot", "senha_hotspot" },
  { "nome_rede_reserva", "senha_reserva" }
};

const unsigned long ATTEMPT_MS = 20000;       // Tempo tentando conectar no WiFi
const unsigned long BETWEEN_ATTEMPT_MS = 500; 

// ============ CONFIGURAÇÃO MQTT (mDNS) ============
// Usamos o hostname para permitir Dual Stack (IPv4/IPv6) automático
#define MQTT_HOST     "raspberrypi.local"
#define MQTT_PORT     1883
#define MQTT_USER     "seu_usuario"      // Deixe vazio se allow_anonymous true
#define MQTT_PASS     "sua_senha"

const char* mqtt_topic_base = "projeto/iot";

// ============ OBJETOS ============
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 10000;

// ============ DECLARAÇÃO DE FUNÇÕES ============
void connectWiFiandMQTT();
bool tryConnect(const char* ssid, const char* pass, unsigned long timeout_ms);
void publishSensorData();
float readTemperature();
float readHumidity();
int readLDRraw();
int rawToPercent(int raw);

// ============ SETUP ============
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LDR_PIN, INPUT);
  dht.begin();

  // Configura o broker pelo NOME (mDNS resolverá o IP)
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  // Função bloqueante: só sai daqui quando conectar WiFi + MQTT
  connectWiFiandMQTT();

  // Inicia mDNS para que o ESP32 também seja encontrável (opcional)
  if (!MDNS.begin("esp32-client")) {
    Serial.println("Erro ao iniciar mDNS responder!");
  } else {
    Serial.println("mDNS iniciado.");
  }

  // Leitura inicial (descarte para estabilizar sensor)
  delay(2000);
  dht.read();
  lastPublish = millis();
}

// ============ LOOP PRINCIPAL ============
void loop() {
  // Verificação de Saúde da Conexão
  if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
    Serial.println("Conexão perdida. Reconectando WiFi + MQTT...");
    connectWiFiandMQTT();
    
    // Reinicia mDNS após reconexão
    if (MDNS.begin("esp32-client")) {
      Serial.println("mDNS reiniciado.");
    }
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  }

  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    publishSensorData();
    lastPublish = now;
  }
}

// ============ LÓGICA DE CONEXÃO ROBUSTA ============
// Tenta conectar em cada rede da lista.
// Só considera sucesso se conectar no WiFi E no Broker MQTT.
void connectWiFiandMQTT() {
  while (true) {
    size_t total = sizeof(wifiList) / sizeof(wifiList[0]);

    for (size_t i = 0; i < total; i++) {
      Serial.println("==================================");
      Serial.printf("Tentando Rede %u: SSID='%s'\n", i + 1, wifiList[i].ssid);
      
      // 1. Tenta WiFi
      if (!tryConnect(wifiList[i].ssid, wifiList[i].pass, ATTEMPT_MS)) {
        Serial.println("WiFi falhou. Tentando próxima...");
        continue;
      }

      Serial.println("WiFi OK! Tentando MQTT via mDNS...");
      
      // Diagnóstico IPv6 (apenas para log)
      String ipv6 = WiFi.localIPv6().toString();
      Serial.print("IPv6: "); Serial.println(ipv6);

      // 2. Tenta MQTT (Usando o Hostname configurado no setup)
      String clientId = "ESP32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
      
      if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
        Serial.println("\n[SUCESSO] MQTT conectado!");
        Serial.println("==================================\n");
        return; // Sai do loop e volta para o Setup/Loop
      }

      // Se WiFi conectou mas MQTT falhou, essa rede não serve.
      Serial.printf("MQTT falhou (rc=%d). Desconectando e tentando próxima rede...\n", mqttClient.state());
      WiFi.disconnect(true);
      delay(1000);
    }

    Serial.println("Nenhuma rede funcionou. Tentando novamente em 5s...");
    delay(5000);
  }
}

// Conexão WiFi Básica com suporte a IPv6
bool tryConnect(const char* ssid, const char* pass, unsigned long timeout_ms) {
  Serial.printf("Conectando a '%s'...\n", ssid);
  
  WiFi.disconnect(true);
  delay(100);

  WiFi.mode(WIFI_STA);
  WiFi.enableIPv6(); // Habilita Dual Stack
  delay(50);
  
  WiFi.begin(ssid, pass);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeout_ms) {
    delay(BETWEEN_ATTEMPT_MS);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Conectado! IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  
  return false;
}

// ============ SENSORES E PUBLICAÇÃO ============
void publishSensorData() {
  float temp = readTemperature();
  float hum = readHumidity();
  int raw = readLDRraw();
  int pct = rawToPercent(raw);

  JsonDocument doc;
  if (!isnan(temp)) doc["temperature"] = roundf(temp * 10) / 10.0;
  if (!isnan(hum))  doc["humidity"] = roundf(hum * 10) / 10.0;
  doc["light_raw"] = raw;
  doc["light_pct"] = pct;
  doc["timestamp"] = millis();

  char payload[256];
  serializeJson(doc, payload, sizeof(payload));

  String topic = String(mqtt_topic_base) + "/telemetry";
  Serial.print("PUBLICANDO: ");
  Serial.println(payload);

  if (mqttClient.connected()) {
    mqttClient.publish(topic.c_str(), payload, false);
  }
}

float readTemperature() {
  float t = dht.readTemperature();
  if (isnan(t)) Serial.println("Erro leitura Temp");
  return t;
}

float readHumidity() {
  float h = dht.readHumidity();
  if (isnan(h)) Serial.println("Erro leitura Umid");
  return h;
}

int readLDRraw() {
  return analogRead(LDR_PIN);
}

int rawToPercent(int raw) {
  int val = map(raw, 0, 4095, 0, 100);
  return constrain(val, 0, 100);
}

```
</details>

### Pontos de configuração (no main.cpp)

* ```MQTT_HOST``` ou ```#define MQTT_SERVER "IP_DA_RPI"``` — aponte para o IP da Raspberry (ou ```raspberrypi.local``` se mDNS funcionar)
* ```MQTT_USER``` / ```MQTT_PASS``` — se tiver autenticação no Mosquitto preencha; caso contrário deixe vazio e use ```allow_anonymous true```
* ```PUBLISH_INTERVAL``` — intervalo entre publicações (por ex. 10000 ms)

## 🧠 Node-RED — Funcionamento e Fluxo Lógico
Fluxo principal dos dados:
```
mqtt in → json → função format_for_dashboard ┬→ Gráfico Temperatura
                                             ├→ Gráfico Umidade
                                             └→ Gauge Luminosidade
```

### Função usada para formatar dados (Node-RED):

```
let p = msg.payload || {};
let now = Date.now();

function safe(v) { return Number(v) || 0; }

let t = safe(p.temperature);
let h = safe(p.humidity);
let lp = safe(p.light_pct);

return [
  { payload: { x: now, y: t } },
  { payload: { x: now, y: h } },
  { payload: lp }
];
```

### Como funciona

1. **mqtt in** recebe mensagens do ESP32.
2. **json** converte a string para objeto.
3. **format_for_dashboard**:
   * valida números
   * gera 3 saídas: temperatura, umidade e luz
4. **gráficos UI** exibem os dados normalmente.


Este fluxo permite:
* **Visualização Contínua:** O dashboard permanece acessível e responsivo para o usuário final.
* **Fácil Manutenção:** Toda a lógica de conversão e validação está centralizada em apenas um nó (`format_for_dashboard`).
* **Clara separação de camadas:**
  * **Entrada:** Recepção via MQTT.
  * **Processamento:** Tratamento do JSON e conversão de tipos.
  * **Apresentação:** Exibição nos widgets visuais.

## 📊 Dashboard (node-red-dashboard)

O dashboard foi construído utilizando o pacote **node-red-dashboard**, permitindo visualizar em tempo real todos os dados publicados pelo ESP32.

A estrutura criada no Node-RED foi:
```
Tab: Projeto IoT
└── Group: Medições
      • Gráfico — Temperatura (linha)
      • Gráfico — Umidade (linha)
      • Gauge — Luminosidade (%)
```

### Componentes utilizados:

* **ui_chart** (temperatura)

* **ui_chart** (umidade)

* **ui_gauge** (luminosidade)

* **ui_text** (opcional: status/última leitura)

* **ui_separator** (opcional: organização visual)

Cada widget está conectado à saída correspondente do bloco **format_for_dashboard**, que separa e valida os dados recebidos via MQTT.


## 📊 Integração com Google Sheets — Apps Script

O script *executa automaticamente todo dia 1* uma função ```rotacionarDadosMensal()``` e:

**1.** Cria nova planilha nomeada:
```
Relatório IoT - mês/ano
```
**2.** Copia dados brutos do formulário

**3.** Calcula médias diárias (umidade/temperatura)

**4.** Gera 3 gráficos:

   * Linha: Umidade e Temperatura
   * Linha: Luz e Temperatura
   * Colunas: Médias diárias
     
**5.** Envia email com o relatório

**6.** Limpa dados da planilha antiga com retry/backoff
O código completo do seu script deve ser colocado em:

```/apps_script/rotacionarDadosMensal.gs```

O script ficou da seguinte forma:

<details>
  <summary><b>Clique aqui para expandir o código do script </b></summary>

```
function rotacionarDadosMensal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaOrigem = ss.getSheetByName("[NOME_DA_ABA_ONDE_OS_DADOS_ESTAO_SENDO_SALVOS]"); 
  // --- CONFIGURAÇÃO ---
  var idFormulario = "[ID_DO_FORMULÁRIO]"; 
  // CONFIGURAÇÃO VISUAL
  const COLUNA_ALINHAMENTO = 11; 
  const LARGURA = 600;
  const ALTURA = 350;
  const LINHA_GRAFICO_1 = 2;
  const LINHA_GRAFICO_2 = 21;
  const LINHA_GRAFICO_3 = 40;
  // --------------------
  // 1. Definição de Datas e Nome do Arquivo
  var dataHoje = new Date();
  var dataMesAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - 1, 1);
  var meses = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var nomeMes = meses[dataMesAnterior.getMonth()];
  var ano = dataMesAnterior.getFullYear();
  // Nome do NOVO ARQUIVO
  var nomeNovoArquivo = "Relatório IoT - " + nomeMes + "/" + ano;
  // 2. Verifica se há dados para mover
  var ultimaLinha = abaOrigem.getLastRow();
  if (ultimaLinha > 1) {
    // Cria uma NOVA PLANILHA (Arquivo separado no Google Drive)
    var novaPlanilha = SpreadsheetApp.create(nomeNovoArquivo);
    var abaDestino = novaPlanilha.getSheets()[0]; // Pega a primeira aba do novo arquivo
    abaDestino.setName("Dados Consolidados");
    // Copia o Cabeçalho
    var cabecalho = abaOrigem.getRange(1, 1, 1, abaOrigem.getLastColumn()).getValues();
    abaDestino.getRange(1, 1, 1, abaOrigem.getLastColumn()).setValues(cabecalho);
    // Pega e move dados brutos para o NOVO ARQUIVO
    var dadosRange = abaOrigem.getRange(2, 1, ultimaLinha - 1, abaOrigem.getLastColumn());
    var valores = dadosRange.getValues();
    abaDestino.getRange(2, 1, valores.length, valores[0].length).setValues(valores);
    // ---------------------------------------------------------
    // 3. PROCESSAMENTO (TABELA DE RESUMO NO NOVO ARQUIVO)
    // ---------------------------------------------------------
    var resumoDiario = {};
    var fusoHorario = ss.getSpreadsheetTimeZone();
    for (var i = 0; i < valores.length; i++) {
      var dataObj = new Date(valores[i][0]);
      var diaChave = Utilities.formatDate(dataObj, fusoHorario, "dd/MM");
      if (!resumoDiario[diaChave]) {
        resumoDiario[diaChave] = {qtd: 0, somaUmidade: 0, somaTemp: 0};
      }
      resumoDiario[diaChave].qtd++;
      resumoDiario[diaChave].somaUmidade += valores[i][1];
      resumoDiario[diaChave].somaTemp += valores[i][3];
    }
    var matrizResumo = [["Dia", "Média Umidade", "Média Temperatura"]];
    for (var dia in resumoDiario) {
      var mediaUmidade = resumoDiario[dia].somaUmidade / resumoDiario[dia].qtd;
      var mediaTemp = resumoDiario[dia].somaTemp / resumoDiario[dia].qtd;
      matrizResumo.push([dia, mediaUmidade, mediaTemp]);
    }
    // Escreve Resumo nas colunas G, H, I do NOVO ARQUIVO
    abaDestino.getRange(1, 7, matrizResumo.length, 3).setValues(matrizResumo);

    // ---------------------------------------------------------
    // 4. CRIAÇÃO DOS GRÁFICOS (NO NOVO ARQUIVO)
    // ---------------------------------------------------------

    // Substituí apenas os blocos de gráficos por versões com legendas e cores explícitas.

    // Gráfico 1: Monitoramento Bruto — Umidade (azul) e Temperatura (vermelho)
    var graficoLinha = abaDestino.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(abaDestino.getRange(2, 1, valores.length, 1)) // Data/hora
      .addRange(abaDestino.getRange(2, 2, valores.length, 1)) // Umidade
      .addRange(abaDestino.getRange(2, 4, valores.length, 1)) // Temperatura
      .setPosition(LINHA_GRAFICO_1, COLUNA_ALINHAMENTO, 0, 0)
      .setOption('title', 'Monitoramento Bruto — Umidade (azul) | Temperatura (vermelho)')
      .setOption('colors', ['#2b9cff', '#ef4444'])
      .setOption('legend', { position: 'right' })
      .setOption('hAxis', { title: 'Tempo' })
      .setOption('vAxis', { title: 'Valor' })
      .setOption('width', LARGURA).setOption('height', ALTURA)
      .build();
    abaDestino.insertChart(graficoLinha);

    // Gráfico 2: Evolução — Luz (amarelo) e Temperatura (vermelho) em linha com eixo 0..100
    var graficoLuzTemp = abaDestino.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(abaDestino.getRange(2, 1, valores.length, 1)) // Data/hora
      .addRange(abaDestino.getRange(2, 3, valores.length, 1)) // Luz
      .addRange(abaDestino.getRange(2, 4, valores.length, 1)) // Temperatura
      .setPosition(LINHA_GRAFICO_2, COLUNA_ALINHAMENTO, 0, 0)
      .setOption('title', 'Evolução: Luz (amarelo) | Temperatura (vermelho)')
      .setOption('colors', ['#f59e0b', '#ef4444'])
      .setOption('legend', { position: 'right' })
      .setOption('hAxis', { title: 'Tempo' })
      .setOption('vAxis', { viewWindow: { min: 0, max: 100 }, title: 'Valor (0–100)' })
      .setOption('width', LARGURA).setOption('height', ALTURA)
      .build();
    abaDestino.insertChart(graficoLuzTemp);

    // Gráfico 3: Médias Diárias — Umidade (azul) / Temperatura (vermelho)
    var graficoColunas = abaDestino.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(abaDestino.getRange(1, 7, matrizResumo.length, 3))
      .setPosition(LINHA_GRAFICO_3, COLUNA_ALINHAMENTO, 0, 0)
      .setOption('title', 'Médias Diárias — Umidade (azul) / Temperatura (vermelho)')
      .setOption('colors', ['#2b9cff', '#ef4444'])
      .setOption('hAxis', { title: 'Dia' })
      .setOption('vAxis', { title: 'Valor Médio' })
      .setOption('legend', { position: 'right' })
      .setOption('width', LARGURA).setOption('height', ALTURA)
      .build();
    abaDestino.insertChart(graficoColunas);

    // ---------------------------------------------------------
    // 5. Limpeza e Notificação
    // Pega a URL do NOVO arquivo criado
    var urlNovoArquivo = novaPlanilha.getUrl();
    try {
      var form = FormApp.openById(idFormulario);
      form.deleteAllResponses();
    } catch (e) {
      Logger.log("Erro ao limpar form: " + e.message);
    }
    MailApp.sendEmail({
      to: "[SEU_E-MAIL]",
      subject: "Relatório IoT Mensal: " + nomeMes + "/" + ano,
      htmlBody: "O relatório foi gerado e arquivado em uma nova planilha.<br>" +
                "Acesse aqui: <a href='" + urlNovoArquivo + "'>Abrir Relatório de " + nomeMes + "</a>"
    });
    // Limpa a planilha original para receber o próximo mês
    //abaOrigem.deleteRows(2, ultimaLinha - 1);
    safeDeleteWithRetry(abaOrigem, 2, ultimaLinha - 1, 12, 4 * 60 * 1000);
  }
}

// ===== Substituir a linha de exclusão por este bloco com retry =====
function safeDeleteWithRetry(sheet, startRow, howMany, maxAttempts, maxMillis) {
  maxAttempts = (typeof maxAttempts === 'number') ? maxAttempts : 8;
  maxMillis = (typeof maxMillis === 'number') ? maxMillis : 4 * 60 * 1000; // 4 minutos por padrão

  var attempt = 0;
  var backoff = 1000; // 1s inicial
  var t0 = new Date().getTime();

  while (true) {
    attempt++;
    try {
      // Tentar deletar linhas (modo "físico").
      // Se preferir apenas limpar conteúdo, substitua pela chamada clearContent abaixo.
      var frozen = sheet.getFrozenRows();
      var maxRows = sheet.getMaxRows();
      var nonFrozenRows = maxRows - frozen;

      // Evita pedir para deletar todas as linhas não congeladas
      var toDelete = howMany;
      if (toDelete >= nonFrozenRows) {
        toDelete = nonFrozenRows - 1;
      }

      if (toDelete > 0) {
        sheet.deleteRows(startRow, toDelete);
      } else {
        // nada a deletar (ou impossível); apenas limpa conteúdo como alternativa
        if (howMany > 0) {
          sheet.getRange(startRow, 1, howMany, sheet.getLastColumn()).clearContent();
        }
      }

      // Se chegou aqui, funcionou
      return;
    } catch (err) {
      // Se já passou muito tempo, aborta lançando o erro
      var elapsed = new Date().getTime() - t0;
      if (elapsed >= maxMillis) {
        throw new Error('Falha ao apagar linhas após ' + attempt + ' tentativas e ' + Math.round(elapsed/1000) + 's: ' + err.message);
      }

      // Se atingiu número máximo de tentativas, também aborta
      if (attempt >= maxAttempts) {
        // ao invés de abortar imediatamente, espera um pouco mais e tenta novamente até maxMillis
        Utilities.sleep(backoff);
        backoff = Math.min(backoff * 2, 30000); // cap 30s
        continue;
      }

      // Espera e tenta novamente (exponential backoff)
      Utilities.sleep(backoff);
      backoff = Math.min(backoff * 2, 30000);
      // loop recomeça
    }
  }
}
```

</details>



### Agendamento: 
Configure no Apps Script: **Triggers** → adicionar trigger para ```**rotacionarDadosMensal()``` → disparo "Time-driven" → "Day of month" = 1

## 🌐 Frontend Web (Netlify)

Além do dashboard local no Node-RED, o projeto conta com uma interface web pública hospedada no Netlify, permitindo monitoramento remoto sem custos de cloud.

* **URL do Projeto:** [paineldecontroleambiental.netlify.app](https://paineldecontroleambiental.netlify.app/)
* **Tecnologia:** HTML, CSS e JavaScript puro (Vanilla JS).
* **Funcionamento:** O site consome os dados JSON diretamente da API do Google Sheets (gerada pelo Script Bridge), atualizando a cada nova submissão do formulário.

## 🧪 Testes e Comandos Úteis

### Na Raspberry Pi
* Ver IP:
```
hostname -I
```
* Ver Mosquitto:
```
sudo systemctl status mosquitto
sudo ss -tlnp | grep 1883
sudo journalctl -u mosquitto -f
```
* Alteração do Hostname da Raspberry para comunicação mDNS:
```
sudo raspi-config
```
1. Vá em **1 System Options** -> **S4 Hostname**.
2. Apague `raspberrypi` e digite o novo nome (ex: `central-iot`, `servidor-casa`).
   > **Regra:** Use apenas letras de **a-z**, números **0-9** e hífen **-**. Nada de espaços ou caracteres especiais.
3. Selecione **OK** e depois **Finish**.
4. O sistema vai pedir para reiniciar (**Reboot**). Aceite.
   
* Testar publicação/subscrição:
```
mosquitto_sub -t 'projeto/iot/telemetry' -v
mosquitto_pub -t 'projeto/iot/telemetry' -m '{"temperature":22}' -d
```
* Ver dashboard:
```
http://IP_DA_RASPBERRY:1880/ui
```
* Status do serviço:
```
sudo systemctl status mosquitto
```
### No Node-RED
* Logs:
```
node-red-log
```
* Reiniciar:
```
node-red-restart # ou
sudo systemctl restart nodered
```
* Debug: usar painel Debug (sidebar do editor)
### Na ESP-32 (Serial)
* Abrir monitor serial (PlatformIO ou Arduino IDE) a 115200 bps
* procurar mensagens:
```
WiFi conectado. IP: ...
Publicando em projeto/iot/telemetry: {...}
mqtt connect returned=1 state=0   # exemplo de saída de debug adicionada
```


## 🩺 Troubleshooting


| Problema                            | Causa provável             | Solução                                         |
| ----------------------------------- | -------------------------- | ----------------------------------------------- |
| Dashboard mostra "connection lost"  | Acessando 127.0.0.1 no PC  | Usar `http://IP_DA_RASPBERRY:1880/ui`           |
| ESP publica mas Node-RED não recebe | Broker configurado errado  | Verificar `mqtt in` → Broker → Host = 127.0.0.1 |
| Node-RED não inicia dashboard       | Falta `node-red-dashboard` | Instalar via npm                                |
| Mosquitto recusando conexão         | Listener apenas em ::1     | Alterar `listener 1883` e reiniciar             |

## 📁 Estrutura do Repositório
```

/Node-RED
    flow.json          # Backup do fluxo Node-RED

/apps_script
    rotacionarDadosMensal.gs

/esp-32
    platformio.ini
    /src
        main.cpp       # Firmware do ESP32

/front-end             # Código do Frontend (Netlify)
    index.html
    style.css
    app.js

/raspberry-pi
    instrucoes.txt
    mosquitto.conf.txt # Configuração do Broker

README.md
```
## 📜 Licença
MIT — Livre para uso acadêmico.

## 👥 Colaboradores

| [<img src="https://avatars.githubusercontent.com/u/106926790?v=4" width=115><br><sub>Caio Hirata</sub>](https://github.com/Kal-0) | [<img src="https://avatars.githubusercontent.com/u/116359369?v=4" width=115><br><sub>Flávio Muniz</sub>](https://github.com/flavio-muniz) | [<img src="https://avatars.githubusercontent.com/u/105346791?v=4" width=115><br><sub>João Lafetá</sub>](https://github.com/joaohlafeta) | [<img src="https://avatars.githubusercontent.com/u/111138996?v=4" width=115><br><sub>Pedro Coelho</sub>](https://github.com/pedro-coelho-dr) | [<img src="https://avatars.githubusercontent.com/u/103130662?v=4" width=115><br><sub>Yara Rodrigues</sub>](https://github.com/Yara-R) |
| :---: | :---: | :---: | :---: | :---: |
