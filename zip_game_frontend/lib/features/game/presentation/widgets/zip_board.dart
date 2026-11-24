import 'package:material_ui/material_ui.dart';

import '../../domain/game_rules.dart';

/// Tablero adaptable al tamaño de pantalla, con toques, arrastre y semántica
/// individual para teclado y lectores de pantalla.
class ZipBoard extends StatefulWidget {
  const ZipBoard({
    super.key,
    required this.rules,
    required this.path,
    required this.onCell,
    this.hintCell,
    this.enabled = true,
  });

  final GameRules rules;
  final List<int> path;
  final ValueChanged<int> onCell;
  final int? hintCell;
  final bool enabled;

  @override
  State<ZipBoard> createState() => _ZipBoardState();
}

class _ZipBoardState extends State<ZipBoard> {
  int? _lastDragCell;

  void _draw(Offset position, double extent) {
    if (!widget.enabled ||
        position.dx < 0 ||
        position.dy < 0 ||
        position.dx >= extent ||
        position.dy >= extent) {
      return;
    }
    final unit = extent / widget.rules.size;
    final cell =
        (position.dy ~/ unit) * widget.rules.size + position.dx ~/ unit;
    if (cell == _lastDragCell) return;
    // Los eventos de puntero pueden saltar celdas al arrastrar rápido.
    // Completa únicamente segmentos rectos; nunca inventa una diagonal.
    final previous = _lastDragCell;
    if (previous != null) {
      final sameRow =
          previous ~/ widget.rules.size == cell ~/ widget.rules.size;
      final sameColumn =
          previous % widget.rules.size == cell % widget.rules.size;
      if (sameRow || sameColumn) {
        final stride =
            (cell > previous ? 1 : -1) * (sameRow ? 1 : widget.rules.size);
        for (
          var crossed = previous + stride;
          crossed != cell;
          crossed += stride
        ) {
          widget.onCell(crossed);
        }
      }
    }
    _lastDragCell = cell;
    widget.onCell(cell);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AspectRatio(
      aspectRatio: 1,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final extent = constraints.maxWidth;
          return MouseRegion(
            cursor: widget.enabled
                ? SystemMouseCursors.click
                : SystemMouseCursors.basic,
            child: GestureDetector(
              key: const Key('game_board'),
              behavior: HitTestBehavior.opaque,
              onPanDown: widget.enabled
                  ? (d) => _draw(d.localPosition, extent)
                  : null,
              onPanStart: widget.enabled
                  ? (d) => _draw(d.localPosition, extent)
                  : null,
              onPanUpdate: widget.enabled
                  ? (d) => _draw(d.localPosition, extent)
                  : null,
              onPanEnd: (_) => _lastDragCell = null,
              onPanCancel: () => _lastDragCell = null,
              onTapUp: (_) => _lastDragCell = null,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerLowest,
                  border: Border.all(color: scheme.outlineVariant),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: CustomPaint(
                          painter: _BoardPainter(
                            size: widget.rules.size,
                            path: widget.path,
                            color: scheme.primary,
                            gridColor: scheme.outlineVariant,
                          ),
                        ),
                      ),
                      for (var cell = 0; cell < widget.rules.totalCells; cell++)
                        Positioned(
                          left:
                              (cell % widget.rules.size) *
                              extent /
                              widget.rules.size,
                          top:
                              (cell ~/ widget.rules.size) *
                              extent /
                              widget.rules.size,
                          width: extent / widget.rules.size,
                          height: extent / widget.rules.size,
                          child: _cell(context, cell),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _cell(BuildContext context, int cell) {
    final scheme = Theme.of(context).colorScheme;
    final clue = widget.rules.clueAt(cell);
    final visited = widget.path.contains(cell);
    final tip = widget.path.isNotEmpty && widget.path.last == cell;
    final hinted = widget.hintCell == cell;
    final next = clue != null && clue == widget.rules.nextClue(widget.path);
    final label =
        'Fila ${cell ~/ widget.rules.size + 1}, '
        'columna ${cell % widget.rules.size + 1}'
        '${clue == null ? '' : ', número $clue'}'
        '${visited ? ', visitada' : ''}${hinted ? ', pista' : ''}';
    return Semantics(
      key: Key('cell_$cell'),
      label: label,
      button: true,
      enabled: widget.enabled,
      selected: tip,
      onTap: widget.enabled ? () => widget.onCell(cell) : null,
      child: FocusableActionDetector(
        enabled: widget.enabled,
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) {
              widget.onCell(cell);
              return null;
            },
          ),
        },
        child: ExcludeSemantics(
          child: Container(
            margin: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: hinted
                  ? scheme.tertiaryContainer.withValues(alpha: 0.8)
                  : null,
              border: hinted || tip
                  ? Border.all(
                      color: hinted ? scheme.tertiary : scheme.primary,
                      width: 3,
                    )
                  : null,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: clue == null
                  ? (tip || hinted
                        ? Icon(
                            hinted ? Icons.lightbulb : Icons.circle,
                            size: hinted ? 24 : 12,
                            color: hinted
                                ? scheme.onTertiaryContainer
                                : scheme.primary,
                          )
                        : null)
                  : FractionallySizedBox(
                      widthFactor: 0.65,
                      heightFactor: 0.65,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: visited ? scheme.primary : scheme.surface,
                          border: Border.all(
                            color: next ? scheme.primary : scheme.outline,
                            width: next ? 2.5 : 1,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$clue',
                            style: TextStyle(
                              color: visited
                                  ? scheme.onPrimary
                                  : scheme.onSurface,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BoardPainter extends CustomPainter {
  _BoardPainter({
    required this.size,
    required this.path,
    required this.color,
    required this.gridColor,
  });

  final int size;
  final List<int> path;
  final Color color;
  final Color gridColor;

  @override
  void paint(Canvas canvas, Size canvasSize) {
    final unit = canvasSize.width / size;
    final grid = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    for (var i = 1; i < size; i++) {
      canvas.drawLine(
        Offset(unit * i, 0),
        Offset(unit * i, canvasSize.height),
        grid,
      );
      canvas.drawLine(
        Offset(0, unit * i),
        Offset(canvasSize.width, unit * i),
        grid,
      );
    }
    if (path.isEmpty) return;
    Offset center(int cell) =>
        Offset((cell % size + 0.5) * unit, (cell ~/ size + 0.5) * unit);
    final stroke = Paint()
      ..color = color.withValues(alpha: 0.35)
      ..strokeWidth = unit * 0.25
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    final trace = Path()..moveTo(center(path.first).dx, center(path.first).dy);
    for (final cell in path.skip(1)) {
      trace.lineTo(center(cell).dx, center(cell).dy);
    }
    canvas.drawPath(trace, stroke);
  }

  @override
  bool shouldRepaint(_BoardPainter oldDelegate) =>
      oldDelegate.path != path ||
      oldDelegate.size != size ||
      oldDelegate.color != color ||
      oldDelegate.gridColor != gridColor;
}
