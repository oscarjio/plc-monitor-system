
import pymcprotocol
import time

# =============================================================================
# Configuration
# =============================================================================
# PLC_HOST should be the IP address of the FX5U PLC.
# PLC_PORT is the port number for SLMP communication (usually 5007 for FX5U).
PLC_HOST = "192.168.1.50"  # Example IP, change as needed
PLC_PORT = 5007

# =============================================================================
# SLMP (Mitsubishi FX5U) Communication
# =============================================================================

def connect_fx5u(host, port):
    """
    Establishes a connection to a Mitsubishi FX5U PLC.
    """
    # For FX5U, we use slmp protocol.
    # The pymcprotocol.Type3E() corresponds to SLMP.
    fx5u = pymcprotocol.Type3E()
    print(f"Attempting to connect to PLC at {host}:{port}...")
    try:
        fx5u.connect(host, port)
        print("Successfully connected to PLC.")
        return fx5u
    except Exception as e:
        print(f"Failed to connect to PLC: {e}")
        return None

def read_plc_data(plc_client):
    """
    Reads a set of data registers from the connected PLC.
    This is just an example reading a D register.
    """
    if not plc_client:
        print("Cannot read data, no PLC connection.")
        return None

    try:
        # Example: Read 10 words (16-bit) from data register D100
        device = "D100"
        count = 10
        word_values = plc_client.batchread_wordunits(headdevice=device, readsize=count)
        print(f"Read {len(word_values)} words from {device}: {word_values}")
        return word_values
    except Exception as e:
        print(f"Error reading data from PLC: {e}")
        return None

# =============================================================================
# Modbus TCP Communication (Placeholder)
# =============================================================================

def connect_modbus_tcp(host, port):
    """
    Placeholder for connecting to a Modbus TCP device.
    """
    print(f"\n[Placeholder] Would connect to Modbus TCP device at {host}:{port}")
    # from pyModbusTCP.client import ModbusClient
    # client = ModbusClient(host=host, port=port, auto_open=True)
    # return client
    return None

# =============================================================================
# Main Execution
# =============================================================================

if __name__ == "__main__":
    print("--- PLC Monitoring Backend Service ---")

    # --- SLMP/FX5U Example ---
    plc = connect_fx5u(PLC_HOST, PLC_PORT)

    if plc:
        try:
            while True:
                read_plc_data(plc)
                # In a real application, this data would be sent to the database.
                time.sleep(5)  # Poll every 5 seconds
        except KeyboardInterrupt:
            print("\nShutting down backend service.")
        finally:
            plc.close()
            print("PLC connection closed.")
    else:
        print("Could not start monitoring loop due to connection failure.")

    # --- Modbus TCP Example ---
    connect_modbus_tcp("192.168.1.51", 502)

