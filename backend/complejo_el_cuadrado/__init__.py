# PyMySQL es un driver de MySQL escrito en Python puro: se instala con pip sin
# compilar nada en Windows. Esta línea hace que Django lo use como si fuera
# mysqlclient, el driver que Django espera por defecto.
import pymysql

pymysql.install_as_MySQLdb()
