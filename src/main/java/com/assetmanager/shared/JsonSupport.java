package com.assetmanager.shared;

import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class JsonSupport {
  private final JsonMapper mapper = JsonMapper.builder().build();

  public String write(Object value) {
    return mapper.writeValueAsString(value);
  }

  public Object read(String value) {
    return mapper.readValue(value, Object.class);
  }
}
