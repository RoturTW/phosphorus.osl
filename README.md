
Phosphorus is the main rotur web engine (eventually) powering browsers like summit on [originOS](https://github.com/Mistium/Origin-OS) :3

This repo specifically is the osl version of phosphorus

<img width="1252" height="710" alt="phosphorus" src="https://raw.githubusercontent.com/RoturTW/phosphorus/refs/heads/main/assets/phosphorus.png" />

# How to clone locally (on [origin](https://origin.mistium.com))
* download [phosphorus.json](https://github.com/RoturTW/phosphorus/blob/main/phosphorus.json) and [unzip.osl](https://github.com/RoturTW/phosphorus/blob/main/unzip.osl)
* create a folder in originOS, e.g. a projects folder
* copy both phosphorus.json and unzip.osl into there
* run unzip.osl, either by double clicking it in files or running it through studio

# How to build locally
* make sure [fpp](https://github.com/Flufi-Boi/fpp) is installed (in ~/:path)
* go into terminal and navigate to your cloned version of phosphorus, e.g. ~/projects/phosphorus
* run the command `fpp script build` or if you want just 1 layout, `fpp script build-layoutName`

# Features

* Modular layout system
  * makes creating new browsers a lot easier
* Bytecode generator and interpreter
  * Phosphorus uses a compiler to convert [rtr](https://docs.rotur.dev/languages/rtr) to a flat instruction based language for speed

idk what else to put here 😔

> [!NOTE]
> phosphorus **must** be built with [fpp](https://github.com/Flufi-Boi/fpp) as it relies on a few of it's features.
