(*
 * Temperature Control Logic - Mitsubishi FX5 PLC
 * Structured Text Program (IEC 61131-3)
 * 
 * This example implements a PID-based temperature control system with:
 * - Temperature monitoring from analog input
 * - PID control calculation
 * - Heater/Cooler relay control
 * - Alarm conditions and safety shutdown
 * - Data logging to registers
 * 
 * Author: PLC Code Development Agent
 * Date: 2025-02-07
 * Version: 1.0.0
 *)

PROGRAM TemperatureControl

  (* ==== Device Declarations ==== *)
  VAR
    (* Input Variables *)
    actual_temp_raw       : INT;      (* Raw analog input 0-32000 *)
    temp_setpoint        : INT;       (* Setpoint register D100 *)
    heater_enable        : BOOL;      (* Enable heater Y0 *)
    cooler_enable        : BOOL;      (* Enable cooler Y1 *)
    
    (* Output Variables *)
    heater_relay         : BOOL;      (* Output relay Y0 *)
    cooler_relay         : BOOL;      (* Output relay Y1 *)
    alarm_led            : BOOL;      (* Alarm indicator Y2 *)
    
    (* PID Control Variables *)
    actual_temp          : REAL;      (* Converted actual temperature *)
    error                : REAL;      (* Temperature error *)
    prev_error           : REAL;      (* Previous error for derivative *)
    
    (* PID Coefficients *)
    kp                   : REAL := 0.5;    (* Proportional gain *)
    ki                   : REAL := 0.1;    (* Integral gain *)
    kd                   : REAL := 0.05;   (* Derivative gain *)
    
    (* PID State *)
    integral_sum         : REAL;      (* Accumulated integral *)
    derivative_term      : REAL;      (* Derivative component *)
    pid_output           : REAL;      (* PID control output *)
    
    (* Safety Limits *)
    min_temp_limit       : INT := 0;      (* Minimum safe temperature *)
    max_temp_limit       : INT := 5000;   (* Maximum safe temperature *)
    alarm_hysteresis     : INT := 100;    (* Alarm threshold *)
    
    (* Alarm & Status *)
    temp_error           : BOOL;      (* Temperature out of range *)
    alarm_active         : BOOL;      (* Alarm condition *)
    alarm_count          : INT;       (* Alarm occurrence counter *)
    
    (* Timing *)
    cycle_time           : INT := 100; (* Cycle time in ms *)
    timer                : TON;       (* Timer for status polling *)
    
    (* Data Logging *)
    log_index            : INT := 0;  (* Log buffer index *)
    log_data_d200        : ARRAY[0..99] OF INT;  (* Log buffer in D200-D299 *)
  END_VAR

  (* ==== Configuration Constants ==== *)
  CONST
    CYCLE_INTERVAL       : INT := 100;
    HEATER_ON_THRESHOLD  : REAL := 50.0;
    COOLER_ON_THRESHOLD  : REAL := 50.0;
    
    (* Device Addresses (will be mapped) *)
    ADDR_ACTUAL_TEMP     : INT := 16#A800;  (* D0 equivalent *)
    ADDR_SETPOINT        : INT := 16#A801;  (* D100 *)
    ADDR_HEATER_OUTPUT   : INT := 16#9D00;  (* Y0 *)
    ADDR_COOLER_OUTPUT   : INT := 16#9D01;  (* Y1 *)
  END_CONST


  (* ==== MAIN PROGRAM LOGIC ==== *)
  
  (* Read Inputs *)
  CALL ReadInputs();
  
  (* Convert raw analog input to temperature (0-32000 = 0-100°C) *)
  actual_temp := (REAL_OF(actual_temp_raw) / 320.0);
  
  (* Calculate PID Control *)
  CALL CalculatePID();
  
  (* Apply Heater/Cooler Control *)
  CALL ControlHeaterCooler();
  
  (* Monitor Safety Conditions *)
  CALL MonitorSafety();
  
  (* Update Alarms *)
  CALL UpdateAlarms();
  
  (* Log Data *)
  CALL LogData();
  
  (* Write Outputs *)
  CALL WriteOutputs();


  (* ========================================
     PROCEDURE: ReadInputs
     Read analog inputs and control signals
     ======================================== *)
  PROCEDURE ReadInputs()
    VAR_TEMP
      temp_val  : INT;
    END_VAR
    
    (* Read raw temperature from analog input *)
    (* NOTE: In actual implementation, use:
       actual_temp_raw := ReadWordUnits("D0", 1);
    *)
    (* For now, read from D0 register *)
    
    (* Read setpoint from D100 *)
    IF temp_setpoint = 0 THEN
      temp_setpoint := 2000;  (* Default 62.5°C *)
    END_IF;
    
    (* Read enable signals from input relays *)
    (* These would normally come from physical inputs or network *)
    
  END_PROCEDURE


  (* ========================================
     PROCEDURE: CalculatePID
     PID control algorithm (parallel form)
     ======================================== *)
  PROCEDURE CalculatePID()
    VAR_TEMP
      setpoint_real : REAL;
      p_term       : REAL;
      i_term       : REAL;
      d_term       : REAL;
      max_integral : REAL := 1000.0;
    END_VAR
    
    (* Convert setpoint to real *)
    setpoint_real := REAL_OF(temp_setpoint) / 320.0;
    
    (* Calculate error *)
    error := setpoint_real - actual_temp;
    
    (* Proportional term *)
    p_term := kp * error;
    
    (* Integral term (anti-windup with saturation) *)
    integral_sum := integral_sum + (ki * error);
    IF integral_sum > max_integral THEN
      integral_sum := max_integral;
    END_IF;
    IF integral_sum < -max_integral THEN
      integral_sum := -max_integral;
    END_IF;
    i_term := integral_sum;
    
    (* Derivative term *)
    d_term := kd * (error - prev_error);
    prev_error := error;
    
    (* Calculate total PID output (-100 to +100) *)
    pid_output := p_term + i_term + d_term;
    
    (* Saturate PID output *)
    IF pid_output > 100.0 THEN
      pid_output := 100.0;
    END_IF;
    IF pid_output < -100.0 THEN
      pid_output := -100.0;
    END_IF;
    
  END_PROCEDURE


  (* ========================================
     PROCEDURE: ControlHeaterCooler
     Apply PID output to heater/cooler
     ======================================== *)
  PROCEDURE ControlHeaterCooler()
    
    IF NOT heater_enable OR alarm_active THEN
      heater_relay := FALSE;
      cooler_relay := FALSE;
      RETURN;
    END_IF;
    
    (* Heating mode: PID output > threshold *)
    IF pid_output > HEATER_ON_THRESHOLD THEN
      heater_relay := TRUE;
      cooler_relay := FALSE;
    END_IF;
    
    (* Cooling mode: PID output < -threshold *)
    IF pid_output < -COOLER_ON_THRESHOLD THEN
      heater_relay := FALSE;
      cooler_relay := TRUE;
    END_IF;
    
    (* Deadband: between thresholds *)
    IF pid_output >= -COOLER_ON_THRESHOLD AND pid_output <= HEATER_ON_THRESHOLD THEN
      heater_relay := FALSE;
      cooler_relay := FALSE;
    END_IF;
    
  END_PROCEDURE


  (* ========================================
     PROCEDURE: MonitorSafety
     Check temperature limits and safety
     ======================================== *)
  PROCEDURE MonitorSafety()
    VAR
      temp_int : INT;
    END_VAR
    
    temp_int := INT_OF(actual_temp * 320.0);
    
    (* Check min temperature *)
    IF temp_int < min_temp_limit THEN
      temp_error := TRUE;
      alarm_active := TRUE;
    END_IF;
    
    (* Check max temperature *)
    IF temp_int > max_temp_limit THEN
      temp_error := TRUE;
      alarm_active := TRUE;
    END_IF;
    
    (* Hysteresis for alarm reset *)
    IF (temp_int >= min_temp_limit + alarm_hysteresis) AND
       (temp_int <= max_temp_limit - alarm_hysteresis) THEN
      temp_error := FALSE;
      IF NOT heater_enable AND NOT cooler_enable THEN
        alarm_active := FALSE;
      END_IF;
    END_IF;
    
  END_PROCEDURE


  (* ========================================
     PROCEDURE: UpdateAlarms
     Update alarm status and indicators
     ======================================== *)
  PROCEDURE UpdateAlarms()
    
    IF temp_error THEN
      alarm_active := TRUE;
      alarm_led := TRUE;
      IF NOT temp_error THEN
        alarm_count := alarm_count + 1;  (* Log alarm event *)
      END_IF;
    ELSE
      alarm_led := FALSE;
    END_IF;
    
  END_PROCEDURE


  (* ========================================
     PROCEDURE: LogData
     Log control data to register buffer
     ======================================== *)
  PROCEDURE LogData()
    VAR_TEMP
      temp_log : INT;
    END_VAR
    
    (* Log actual temperature (every 10 cycles) *)
    IF (timer.Q AND (log_index MOD 10 = 0)) THEN
      temp_log := INT_OF(actual_temp * 320.0);
      
      (* Store in D200-D299 buffer *)
      log_data_d200[log_index MOD 100] := temp_log;
      
      log_index := log_index + 1;
    END_IF;
    
  END_PROCEDURE


  (* ========================================
     PROCEDURE: WriteOutputs
     Write control signals to relays
     ======================================== *)
  PROCEDURE WriteOutputs()
    
    (* Write heater control *)
    (* WriteWordUnits("Y0", heater_relay); *)
    
    (* Write cooler control *)
    (* WriteWordUnits("Y1", cooler_relay); *)
    
    (* Write alarm indicator *)
    (* WriteWordUnits("Y2", alarm_led); *)
    
  END_PROCEDURE


END_PROGRAM
