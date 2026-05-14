# Proyecto "Analizador Sintactico" - NEBULA

## 1. Descripcion general

El proyecto implementa un analizador sintactico para el lenguaje NEBULA, un
lenguaje con sintaxis inspirada en pseudocodigo. El flujo actual del compilador
es:

1. Analizador lexico: convierte el codigo fuente en tokens.
2. Analizador sintactico: valida la estructura del programa y construye un AST.
3. Analizador semantico: valida declaraciones, tipos y uso de funciones.
4. Traductor: genera codigo Java equivalente.

El analizador sintactico esta implementado en:

- `ProyectoCompi/backend/src/parser/parser.service.ts`
- `ProyectoCompi/backend/src/parser/ast.ts`

## 2. Tokens y elementos terminales

```bnf
<letra> ::= "a" | ... | "z" | "A" | ... | "Z"
<digito> ::= "0" | ... | "9"
<identificador> ::= <letra> { <letra> | <digito> }
<numero> ::= <digito> { <digito> } [ "." <digito> { <digito> } ]
<cadena> ::= '"' { caracter } '"'
<booleano> ::= "Verdadero" | "Falso"
<tipo> ::= "Entero" | "Real" | "Cadena" | "Logico"
<tipo_funcion> ::= <tipo> | "Vacio"
<operador_relacional> ::= "==" | "!=" | "<=" | ">=" | "<" | ">"
<operador_aritmetico> ::= "+" | "-" | "*" | "/"
<asignador> ::= "<-"
```

## 3. Gramatica BNF

```bnf
<programa> ::= "Algoritmo" <identificador> <bloque> "FinAlgoritmo"

<bloque> ::= { <sentencia> }

<sentencia> ::= <declaracion>
              | <asignacion>
              | <escritura>
              | <si>
              | <mientras>
              | <hacer_mientras>
              | <para>
              | <segun>
              | <funcion>
              | <retorno>

<declaracion> ::= "Definir" <identificador> "Como" <tipo>

<asignacion> ::= <identificador> "<-" <expresion>

<escritura> ::= "Escribir" <expresion>

<si> ::= "Si" <condicion> "Entonces" <bloque> [ "Sino" <bloque> ] "FinSi"

<mientras> ::= "Mientras" <condicion> "Hacer" <bloque> "FinMientras"

<hacer_mientras> ::= "Hacer" <bloque> "Mientras" <condicion>

<para> ::= "Para" <identificador> "<-" <expresion> "Hasta" <expresion> "Hacer" <bloque> "FinPara"

<segun> ::= "Segun" <expresion> "Hacer" { <caso> } [ <defecto> ] "FinSegun"
<caso> ::= "Caso" <expresion> <bloque>
<defecto> ::= "Defecto" <bloque>

<funcion> ::= "Funcion" <identificador> "(" [ <parametros> ] ")" "Como" <tipo_funcion> <bloque> "FinFuncion"
<parametros> ::= <parametro> { "," <parametro> }
<parametro> ::= <identificador> "Como" <tipo>

<retorno> ::= "Retornar" <expresion>

<condicion> ::= <operando> <operador_relacional> <operando>
<operando> ::= <identificador> | <numero> | <cadena> | <booleano>

<expresion> ::= <literal>
              | <identificador>
              | <llamada_funcion>
              | <expresion_aritmetica>

<literal> ::= <numero> | <cadena> | <booleano>
<llamada_funcion> ::= <identificador> "(" [ <argumentos> ] ")"
<argumentos> ::= <expresion> { "," <expresion> }
<expresion_aritmetica> ::= <operando_aritmetico> { <operador_aritmetico> <operando_aritmetico> }
<operando_aritmetico> ::= <identificador> | <numero> | <llamada_funcion>
```

## 4. Diagramas de sintaxis tipo Conway

Los diagramas se presentan en formato textual equivalente a diagramas de
ferrocarril.

```text
PROGRAMA
Inicio -> Algoritmo -> identificador -> BLOQUE -> FinAlgoritmo -> Fin

DECLARACION
Inicio -> Definir -> identificador -> Como -> tipo -> Fin

ASIGNACION
Inicio -> identificador -> <- -> EXPRESION -> Fin

ESCRITURA
Inicio -> Escribir -> EXPRESION -> Fin

SI
Inicio -> Si -> CONDICION -> Entonces -> BLOQUE -> [Sino -> BLOQUE] -> FinSi -> Fin

MIENTRAS
Inicio -> Mientras -> CONDICION -> Hacer -> BLOQUE -> FinMientras -> Fin

HACER MIENTRAS
Inicio -> Hacer -> BLOQUE -> Mientras -> CONDICION -> Fin

PARA
Inicio -> Para -> identificador -> <- -> EXPRESION -> Hasta -> EXPRESION -> Hacer -> BLOQUE -> FinPara -> Fin

SEGUN
Inicio -> Segun -> EXPRESION -> Hacer -> {Caso -> EXPRESION -> BLOQUE} -> [Defecto -> BLOQUE] -> FinSegun -> Fin

FUNCION
Inicio -> Funcion -> identificador -> ( -> [PARAMETROS] -> ) -> Como -> tipo_funcion -> BLOQUE -> FinFuncion -> Fin

RETORNO
Inicio -> Retornar -> EXPRESION -> Fin
```

## 5. Ejemplos aceptados, derivacion y arbol

### 5.1 Programa

Ejemplo A:

```nebula
Algoritmo Demo
FinAlgoritmo
```

Derivacion:

```text
<programa>
=> Algoritmo <identificador> <bloque> FinAlgoritmo
=> Algoritmo Demo <bloque> FinAlgoritmo
=> Algoritmo Demo FinAlgoritmo
```

Arbol:

```text
PROGRAM(Demo)
```

Ejemplo B:

```nebula
Algoritmo Principal
Escribir "Hola"
FinAlgoritmo
```

Derivacion:

```text
<programa>
=> Algoritmo Principal <bloque> FinAlgoritmo
=> Algoritmo Principal <sentencia> FinAlgoritmo
=> Algoritmo Principal <escritura> FinAlgoritmo
=> Algoritmo Principal Escribir "Hola" FinAlgoritmo
```

Arbol:

```text
PROGRAM(Principal)
  PRINT("Hola")
```

### 5.2 Declaracion de variables

Ejemplo A:

```nebula
Definir edad Como Entero
```

Derivacion:

```text
<declaracion> => Definir <identificador> Como <tipo>
              => Definir edad Como Entero
```

Arbol:

```text
DECLARATION
  name: edad
  dataType: Entero
```

Ejemplo B:

```nebula
Definir nombre Como Cadena
```

Derivacion:

```text
<declaracion> => Definir nombre Como Cadena
```

Arbol:

```text
DECLARATION
  name: nombre
  dataType: Cadena
```

### 5.3 Asignacion

Ejemplo A:

```nebula
edad <- 20
```

Derivacion:

```text
<asignacion> => <identificador> <- <expresion>
             => edad <- <literal>
             => edad <- 20
```

Arbol:

```text
ASSIGNMENT
  name: edad
  expression: 20
```

Ejemplo B:

```nebula
nombre <- "Ana"
```

Derivacion:

```text
<asignacion> => nombre <- <literal>
             => nombre <- "Ana"
```

Arbol:

```text
ASSIGNMENT
  name: nombre
  expression: "Ana"
```

### 5.4 Escritura

Ejemplo A:

```nebula
Escribir nombre
```

Derivacion:

```text
<escritura> => Escribir <expresion>
            => Escribir nombre
```

Arbol:

```text
PRINT
  expression: nombre
```

Ejemplo B:

```nebula
Escribir "Proceso terminado"
```

Derivacion:

```text
<escritura> => Escribir <literal>
            => Escribir "Proceso terminado"
```

Arbol:

```text
PRINT
  expression: "Proceso terminado"
```

### 5.5 Estructura selectiva Si

Ejemplo A:

```nebula
Si edad >= 18 Entonces
Escribir "Mayor"
FinSi
```

Derivacion:

```text
<si>
=> Si <condicion> Entonces <bloque> FinSi
=> Si edad >= 18 Entonces <escritura> FinSi
=> Si edad >= 18 Entonces Escribir "Mayor" FinSi
```

Arbol:

```text
IF
  condition: edad >= 18
  children:
    PRINT("Mayor")
```

Ejemplo B:

```nebula
Si nota >= 61 Entonces
Escribir "Aprobado"
Sino
Escribir "Reprobado"
FinSi
```

Derivacion:

```text
<si>
=> Si <condicion> Entonces <bloque> Sino <bloque> FinSi
=> Si nota >= 61 Entonces <escritura> Sino <escritura> FinSi
```

Arbol:

```text
IF
  condition: nota >= 61
  children:
    PRINT("Aprobado")
  elseBranch:
    PRINT("Reprobado")
```

### 5.6 Ciclo Mientras

Ejemplo A:

```nebula
Mientras contador < 5 Hacer
Escribir contador
FinMientras
```

Derivacion:

```text
<mientras>
=> Mientras <condicion> Hacer <bloque> FinMientras
=> Mientras contador < 5 Hacer <escritura> FinMientras
```

Arbol:

```text
WHILE
  condition: contador < 5
  children:
    PRINT(contador)
```

Ejemplo B:

```nebula
Mientras activo == Verdadero Hacer
Escribir "Ejecutando"
FinMientras
```

Derivacion:

```text
<mientras> => Mientras activo == Verdadero Hacer <escritura> FinMientras
```

Arbol:

```text
WHILE
  condition: activo == Verdadero
  children:
    PRINT("Ejecutando")
```

### 5.7 Ciclo Hacer-Mientras

Ejemplo A:

```nebula
Hacer
Escribir contador
Mientras contador < 10
```

Derivacion:

```text
<hacer_mientras>
=> Hacer <bloque> Mientras <condicion>
=> Hacer <escritura> Mientras contador < 10
```

Arbol:

```text
DO_WHILE
  children:
    PRINT(contador)
  condition: contador < 10
```

Ejemplo B:

```nebula
Hacer
Escribir "Intento"
Mientras intentos <= 3
```

Derivacion:

```text
<hacer_mientras> => Hacer <escritura> Mientras intentos <= 3
```

Arbol:

```text
DO_WHILE
  children:
    PRINT("Intento")
  condition: intentos <= 3
```

### 5.8 Ciclo Para

Ejemplo A:

```nebula
Para i <- 1 Hasta 5 Hacer
Escribir i
FinPara
```

Derivacion:

```text
<para>
=> Para <identificador> <- <expresion> Hasta <expresion> Hacer <bloque> FinPara
=> Para i <- 1 Hasta 5 Hacer <escritura> FinPara
```

Arbol:

```text
FOR
  name: i
  value: 1
  expression: 5
  children:
    PRINT(i)
```

Ejemplo B:

```nebula
Para indice <- inicio Hasta limite Hacer
Escribir indice
FinPara
```

Derivacion:

```text
<para> => Para indice <- inicio Hasta limite Hacer <escritura> FinPara
```

Arbol:

```text
FOR
  name: indice
  value: inicio
  expression: limite
  children:
    PRINT(indice)
```

### 5.9 Estructura Segun

Ejemplo A:

```nebula
Segun opcion Hacer
Caso 1
Escribir "Crear"
Caso 2
Escribir "Editar"
FinSegun
```

Derivacion:

```text
<segun>
=> Segun <expresion> Hacer <caso> <caso> FinSegun
=> Segun opcion Hacer Caso 1 <bloque> Caso 2 <bloque> FinSegun
```

Arbol:

```text
SWITCH
  expression: opcion
  CASE 1:
    PRINT("Crear")
  CASE 2:
    PRINT("Editar")
```

Ejemplo B:

```nebula
Segun opcion Hacer
Caso 1
Escribir "Uno"
Defecto
Escribir "Otro"
FinSegun
```

Derivacion:

```text
<segun>
=> Segun opcion Hacer <caso> <defecto> FinSegun
=> Segun opcion Hacer Caso 1 <escritura> Defecto <escritura> FinSegun
```

Arbol:

```text
SWITCH
  expression: opcion
  CASE 1:
    PRINT("Uno")
  DEFAULT:
    PRINT("Otro")
```

### 5.10 Funcion

Ejemplo A:

```nebula
Funcion Sumar(a Como Entero, b Como Entero) Como Entero
Retornar a + b
FinFuncion
```

Derivacion:

```text
<funcion>
=> Funcion <identificador> ( <parametros> ) Como <tipo_funcion> <bloque> FinFuncion
=> Funcion Sumar ( a Como Entero, b Como Entero ) Como Entero <retorno> FinFuncion
```

Arbol:

```text
FUNCTION
  name: Sumar
  params:
    a: Entero
    b: Entero
  returnType: Entero
  children:
    RETURN(a + b)
```

Ejemplo B:

```nebula
Funcion Saludar(nombre Como Cadena) Como Vacio
Escribir nombre
FinFuncion
```

Derivacion:

```text
<funcion> => Funcion Saludar ( nombre Como Cadena ) Como Vacio <escritura> FinFuncion
```

Arbol:

```text
FUNCTION
  name: Saludar
  params:
    nombre: Cadena
  returnType: Vacio
  children:
    PRINT(nombre)
```

### 5.11 Retorno

Ejemplo A:

```nebula
Retornar total
```

Derivacion:

```text
<retorno> => Retornar <expresion>
          => Retornar total
```

Arbol:

```text
RETURN
  expression: total
```

Ejemplo B:

```nebula
Retornar Verdadero
```

Derivacion:

```text
<retorno> => Retornar <literal>
          => Retornar Verdadero
```

Arbol:

```text
RETURN
  expression: Verdadero
```

## 6. Programa completo aceptado

```nebula
Algoritmo MenuDemo
Definir opcion Como Entero
Definir i Como Entero
opcion <- 2

Si opcion == 1 Entonces
Escribir "Crear"
Sino
Escribir "Consultar"
FinSi

Para i <- 1 Hasta 3 Hacer
Escribir i
FinPara

Segun opcion Hacer
Caso 1
Escribir "Caso crear"
Caso 2
Escribir "Caso consultar"
Defecto
Escribir "Opcion invalida"
FinSegun
FinAlgoritmo
```

Arbol general:

```text
PROGRAM(MenuDemo)
  DECLARATION(opcion: Entero)
  DECLARATION(i: Entero)
  ASSIGNMENT(opcion <- 2)
  IF(opcion == 1)
    PRINT("Crear")
    ELSE PRINT("Consultar")
  FOR(i <- 1 Hasta 3)
    PRINT(i)
  SWITCH(opcion)
    CASE 1:
      PRINT("Caso crear")
    CASE 2:
      PRINT("Caso consultar")
    DEFAULT:
      PRINT("Opcion invalida")
```

## 7. Reglas sintacticas validadas por el parser

- El programa debe iniciar con `Algoritmo nombre`.
- El programa debe finalizar con `FinAlgoritmo`.
- No se permite codigo despues de `FinAlgoritmo`.
- Las estructuras de bloque deben cerrarse con su palabra correspondiente:
  `FinSi`, `FinMientras`, `FinPara`, `FinSegun` o `FinFuncion`.
- Las condiciones deben tener la forma `operando operador_relacional operando`.
- Las declaraciones deben usar la forma `Definir variable Como Tipo`.
- Las funciones deben declarar parametros como `nombre Como Tipo`.

