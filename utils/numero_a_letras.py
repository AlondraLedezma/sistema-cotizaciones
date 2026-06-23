def numero_a_letras(numero):
    entero = int(numero)
    decimales = round((numero - entero) * 100)
    unidades = ["","UN","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ",
                "ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE"]
    decenas = ["","DIEZ","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"]
    centenas = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS",
                "SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"]
    def grp(n):
        if n==0: return ""
        if n==100: return "CIEN"
        if n<20: return unidades[n]
        if n<30: r=n-20; return "VEINTI"+unidades[r] if r else "VEINTE"
        if n<100:
            d,u=divmod(n,10); return decenas[d]+(" Y "+unidades[u] if u else "")
        c,r=divmod(n,100); return centenas[c]+(" "+grp(r) if r else "")
    def conv(n):
        if n==0: return "CERO"
        if n<0: return "MENOS "+conv(-n)
        p=[]
        if n>=1_000_000:
            m,n=divmod(n,1_000_000)
            p.append("UN MILLÓN" if m==1 else conv(m)+" MILLONES")
        if n>=1000:
            m,n=divmod(n,1000)
            p.append("MIL" if m==1 else conv(m)+" MIL") if True else None
            if m==1: p.append("MIL")
            else: p.append(grp(m)+" MIL")
            p.pop(-2) if len(p)>1 and p[-2].endswith("MIL") else None
        if n>0: p.append(grp(n))
        return " ".join(p)
    return f"{conv(entero)} PESOS {decimales:02d}/100 M.N."
