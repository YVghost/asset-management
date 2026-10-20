package com.assetmanager.shared;

import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  ResponseEntity<?> uploadTooLarge(Exception error) {
    return ResponseEntity.badRequest()
        .body(Map.of("message", "El logo debe pesar como máximo 1 MB"));
  }

  @ExceptionHandler(ApiException.class)
  ResponseEntity<?> business(ApiException e) {
    return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> validation(MethodArgumentNotValidException e) {
    return ResponseEntity.badRequest()
        .body(
            Map.of(
                "message",
                "Revisa los datos del formulario",
                "fields",
                e.getBindingResult().getFieldErrors().stream()
                    .collect(
                        Collectors.toMap(
                            f -> f.getField(), f -> f.getDefaultMessage(), (a, b) -> a))));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> integrity(DataIntegrityViolationException e) {
    return ResponseEntity.status(409)
        .body(
            Map.of(
                "message", "El código ya existe o el registro está relacionado con otros datos"));
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class
  })
  ResponseEntity<?> malformed(Exception e) {
    return ResponseEntity.badRequest().body(Map.of("message", "Formato de datos incorrecto"));
  }
}
