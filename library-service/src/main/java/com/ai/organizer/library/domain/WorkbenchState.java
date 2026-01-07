package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "WORKBENCH_STATES", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "file_hash"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkbenchState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "file_hash", nullable = false)
    private String fileHash;

    // Guarda o array de nós: [{id: "h-1", x: 100, y: 200, type: "highlight"}, ...]
    @Column(name = "nodes_json", columnDefinition = "TEXT")
    private String nodesJson;

    // Guarda as conexões manuais: [{id: "e1-2", source: "h-1", target: "s-5"}, ...]
    @Column(name = "edges_json", columnDefinition = "TEXT")
    private String edgesJson;

    public WorkbenchState(String userId, String fileHash, String nodesJson, String edgesJson) {
        this.userId = userId;
        this.fileHash = fileHash;
        this.nodesJson = nodesJson;
        this.edgesJson = edgesJson;
    }
}