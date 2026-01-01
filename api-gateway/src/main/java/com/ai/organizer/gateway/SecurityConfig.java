
package com.ai.organizer.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            // Esta linha diz ao Spring Security para usar a configuração de CORS definida no Bean abaixo
            .cors(Customizer.withDefaults()) 
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/actuator/**").permitAll()
                .pathMatchers(org.springframework.http.HttpMethod.OPTIONS).permitAll()
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

        return http.build();
    }

    /**
     * CONFIGURAÇÃO DE CORS (SÊNIOR)
     * Define quem pode chamar essa API.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 1. Permite a origem do Frontend (Vite)
        configuration.setAllowedOrigins(List.of("http://localhost:5173")); 
        
        // 2. Permite os métodos necessários
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        // 3. Permite todos os headers (especialmente Authorization para o Token JWT)
        configuration.setAllowedHeaders(List.of("*"));
        
        // 4. Permite credenciais/cookies (Importante para alguns fluxos OIDC)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Aplica essa regra para TODAS as rotas do Gateway
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}