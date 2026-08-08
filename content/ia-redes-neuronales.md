# Inteligencia Artificial y Aprendizaje Profundo

La **Inteligencia Artificial (IA)** es la disciplina científica que busca construir sistemas informáticos capaces de realizar tareas que habitualmente requieren inteligencia humana, tales como el razonamiento, la percepción visual, la traducción de lenguajes y la toma de decisiones.

> [!IMPORTANT]
> El **Aprendizaje Profundo (Deep Learning)** es una subdisciplina del Machine Learning inspirada en la arquitectura biológica de las neuronas de nuestro cerebro.

---

## 1. De la Neurona Biológica al Perceptrón

En 1958, Frank Rosenblatt inventó el **Perceptrón**, el algoritmo fundamental sobre el cual se basan las redes neuronales modernas.

$$\text{Salida} = f\left( \sum_{i=1}^{n} w_i x_i + b \right)$$

Donde:
- $x_i$: Entradas numéricas (ej. píxeles de una imagen).
- $w_i$: Pesos asociados que determinan la importancia de cada entrada.
- $b$: Sesgo (bias) para ajustar la respuesta del modelo.
- $f$: Función de activación (ej. ReLU, Sigmoide).

---

## 2. Arquitecturas Modernas de IA

Hoy en día existen diversas arquitecturas especializadas para resolver distintos problemas complejos:

1. **Redes Neuronales Convolucionales (CNN):** Especializadas en procesamiento de imágenes y visión por computadora.
2. **Redes Neuronales Recurrentes (RNN/LSTM):** Diseñadas para secuencias temporales como audio o texto.
3. **Transformers (Atención es todo lo que necesitas):** La arquitectura revolucionaria creada por Google en 2017 que impulsó a los modelos LLM como ChatGPT, Gemini y Claude.

> [!TIP]
> **Mecanismo de Atención:** Permite a la red sopesar dinámicamente la importancia relativa de diferentes palabras en una oración sin importar su distancia.

---

## 3. Ejemplo de Código: Perceptrón Simple en Python

```python
import numpy as np

class Perceptron:
    def __init__(self, input_size, lr=0.01, epochs=100):
        self.weights = np.zeros(input_size + 1)
        self.lr = lr
        self.epochs = epochs

    def activation_fn(self, x):
        return 1 if x >= 0 else 0

    def predict(self, x):
        z = self.weights[1:].dot(x) + self.weights[0]
        return self.activation_fn(z)

# Instanciación
model = Perceptron(input_size=2)
print("Modelo inicializado con éxito.")
```

---

## 4. Retos Éticos y Futuro de la IA

Con el avance acelerado de la IA, surgen importantes preguntas éticas que la sociedad debe abordar:

- **Sesgo en los datos:** Los modelos pueden perpetuar prejuicios presentes en los conjuntos de entrenamiento.
- **Privacidad y Derechos de Autor:** Manejo ético del código y texto extraído de la web.
- **Transparencia y Explicabilidad:** Entender por qué un modelo tomó una decisión médica o financiera determinada.
